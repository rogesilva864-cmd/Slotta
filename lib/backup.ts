import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { prisma } from '@/lib/prisma';

const gzipAsync = promisify(gzip);

const TIMEZONE = 'America/Sao_Paulo';
const BACKUP_AFTER_MINUTES = 3 * 60;
const KEEP_LOCAL_BACKUPS = 7;
const OFFSITE_RETRY_MS = 15 * 60 * 1000;

let lastOffsiteAttempt = 0;

function brazilNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function databaseFilePath() {
  const url = process.env.DATABASE_URL || '';
  if (!url.startsWith('file:')) return null;
  const path = url.slice('file:'.length).split('?')[0];
  // O Prisma resolve caminhos relativos a partir da pasta do schema.
  return isAbsolute(path) ? path : resolve(process.cwd(), 'prisma', path);
}

function offsiteConfig() {
  const bucket = process.env.BACKUP_S3_BUCKET;
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.BACKUP_S3_ENDPOINT || undefined,
    region: process.env.BACKUP_S3_REGION || 'auto',
    prefix: (process.env.BACKUP_S3_PREFIX ?? 'slotta/').replace(/^\/+/, ''),
  };
}

async function uploadOffsite(fileName: string, data: Buffer) {
  const config = offsiteConfig();
  if (!config) return false;

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: `${config.prefix}${fileName}`,
      Body: data,
      ContentType: 'application/gzip',
    })
  );
  return true;
}

async function pruneLocalBackups(dir: string) {
  const files = (await readdir(dir)).filter((name) => /^slotta-\d{4}-\d{2}-\d{2}\.db\.gz$/.test(name)).sort();
  for (const name of files.slice(0, Math.max(0, files.length - KEEP_LOCAL_BACKUPS))) {
    await rm(join(dir, name), { force: true });
    await rm(join(dir, `${name}.uploaded`), { force: true });
  }
}

/**
 * Faz o backup diário (a partir das 03:00, Brasília): snapshot consistente do
 * SQLite (VACUUM INTO) compactado no volume e, se configurado, enviado a um
 * armazenamento externo S3-compatível. Idempotente: seguro chamar a cada minuto.
 */
export async function processBackups() {
  if (brazilNow().minutes < BACKUP_AFTER_MINUTES) return { created: false, uploaded: false };
  return runBackup();
}

export async function runBackup() {
  const dbPath = databaseFilePath();
  if (!dbPath) return { created: false, uploaded: false };

  const { date } = brazilNow();
  const dir = join(dirname(dbPath), 'backups');
  await mkdir(dir, { recursive: true });

  const fileName = `slotta-${date}.db.gz`;
  const finalPath = join(dir, fileName);
  const uploadedMarker = `${finalPath}.uploaded`;
  let created = false;

  if (!existsSync(finalPath)) {
    const tempDb = join(dir, `slotta-${date}.db.tmp`);
    await rm(tempDb, { force: true });
    await prisma.$executeRawUnsafe(`VACUUM INTO '${tempDb.replace(/'/g, "''")}'`);

    const compressed = await gzipAsync(await readFile(tempDb));
    await rm(tempDb, { force: true });

    const tempGz = `${finalPath}.tmp`;
    await writeFile(tempGz, compressed);
    await rename(tempGz, finalPath);
    await pruneLocalBackups(dir);
    created = true;
    console.log(`[backup] Backup local criado: ${fileName} (${Math.round(compressed.length / 1024)} KB).`);
  }

  let uploaded = false;
  if (offsiteConfig() && !existsSync(uploadedMarker) && Date.now() - lastOffsiteAttempt >= OFFSITE_RETRY_MS) {
    lastOffsiteAttempt = Date.now();
    try {
      uploaded = await uploadOffsite(fileName, await readFile(finalPath));
      if (uploaded) {
        await writeFile(uploadedMarker, new Date().toISOString());
        console.log(`[backup] Backup enviado ao armazenamento externo: ${fileName}.`);
      }
    } catch (error) {
      console.error('[backup] Falha ao enviar o backup ao armazenamento externo (nova tentativa em 15 min):', error);
    }
  }

  return { created, uploaded };
}
