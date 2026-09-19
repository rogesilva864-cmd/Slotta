// Limitador de taxa em memória (janela deslizante). O Slotta roda em um único
// processo Node no Railway, então o estado em memória é suficiente; ao
// reiniciar, os contadores zeram, o que é aceitável para proteção contra spam.

export type RateLimitOptions = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

const buckets = new Map<string, number[]>();
const MAX_KEYS = 20000;

function recentHits(key: string, windowMs: number, now: number) {
  const hits = (buckets.get(key) ?? []).filter((timestamp) => timestamp > now - windowMs);
  if (hits.length === 0) buckets.delete(key);
  else buckets.set(key, hits);
  return hits;
}

function pruneIfNeeded(windowMs: number, now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const key of buckets.keys()) recentHits(key, windowMs, now);
  if (buckets.size >= MAX_KEYS) buckets.clear();
}

function result(hits: number[], { limit, windowMs }: RateLimitOptions, now: number): RateLimitResult {
  if (hits.length < limit) return { allowed: true, retryAfterSeconds: 0 };
  const oldest = hits[0];
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
}

/** Consome uma tentativa. */
export function takeRateLimit(key: string, options: RateLimitOptions, now = Date.now()): RateLimitResult {
  pruneIfNeeded(options.windowMs, now);
  const hits = recentHits(key, options.windowMs, now);
  const outcome = result(hits, options, now);
  if (outcome.allowed) buckets.set(key, [...hits, now]);
  return outcome;
}

/** Consulta sem consumir tentativa. */
export function peekRateLimit(key: string, options: RateLimitOptions, now = Date.now()): RateLimitResult {
  return result(recentHits(key, options.windowMs, now), options, now);
}

/** Registra uma ocorrência sem verificar (usado para contar só falhas). */
export function recordHit(key: string, windowMs: number, now = Date.now()) {
  pruneIfNeeded(windowMs, now);
  buckets.set(key, [...recentHits(key, windowMs, now), now]);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function getClientIp(request: Request) {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  // Atrás de proxy, o último item é o adicionado pelo proxy (o primeiro pode ser forjado pelo cliente).
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return 'unknown';
}

export function tooManyRequests(message: string, retryAfterSeconds: number) {
  return new Response(JSON.stringify({ message }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) },
  });
}
