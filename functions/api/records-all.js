import { json, handleCors, checkAdmin } from '../_lib.js';

export async function onRequest(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const ADMIN = env.ADMIN || 'teacher123';
  const cors = handleCors(context.request.method);
  if (cors) return cors;

  if (!checkAdmin(url, ADMIN)) return json({ error: 'forbidden' }, 403);
  const rows = await env.DB.prepare(
    'SELECT r.sid, r.month, r.learning_status, r.doubts, r.mood, r.relationship, r.life, s.name AS name FROM records r LEFT JOIN students s ON r.sid = s.sid ORDER BY r.sid, r.month'
  ).all();
  return json(rows.results || []);
}
