# Backup do banco de dados

Todos os dados do Slotta (empresas, clientes, agendamentos) ficam em um único
arquivo SQLite no volume do Railway (`/data/prod.db`). O servidor faz backup
sozinho, todos os dias a partir das 03:00 (horário de Brasília).

## O que acontece automaticamente

1. **Cópia local:** um snapshot consistente do banco, compactado, é salvo em
   `/data/backups/slotta-AAAA-MM-DD.db.gz` (guarda os 7 mais recentes). Protege
   contra erro de migração ou dado apagado por engano.
2. **Cópia externa (recomendada):** se as variáveis `BACKUP_S3_*` estiverem
   configuradas, o mesmo arquivo é enviado para um armazenamento fora do
   Railway. Protege contra perda do próprio volume. Se o envio falhar, o
   servidor tenta de novo a cada 15 minutos e registra o erro no log.

Sem as variáveis `BACKUP_S3_*`, só existe a cópia local, que fica no mesmo
volume do banco: **não protege se o volume for perdido**.

## Configurar a cópia externa (Cloudflare R2, exemplo)

1. Crie uma conta em cloudflare.com e, em **R2**, um bucket privado (ex: `slotta-backups`).
2. Em **R2 → Manage API tokens**, crie um token com permissão **Object Read & Write** restrito a esse bucket.
3. No Railway (serviço Slotta → Variables), adicione:

```
BACKUP_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
BACKUP_S3_BUCKET=slotta-backups
BACKUP_S3_ACCESS_KEY_ID=...
BACKUP_S3_SECRET_ACCESS_KEY=...
```

Backblaze B2 e AWS S3 funcionam do mesmo jeito (mude `BACKUP_S3_ENDPOINT` e
`BACKUP_S3_REGION`). Os arquivos contêm dados de clientes: mantenha o bucket
privado e, se quiser limitar o custo, crie uma regra de expiração (ex: 30 dias).

## Restaurar

1. Baixe o `slotta-AAAA-MM-DD.db.gz` desejado (do bucket, ou de `/data/backups` pelo shell do Railway).
2. Descompacte: `gunzip slotta-AAAA-MM-DD.db.gz`
3. Pare o serviço no Railway, substitua `/data/prod.db` pelo arquivo descompactado e inicie o serviço de novo.

Guarde uma cópia do `prod.db` atual antes de substituir.
