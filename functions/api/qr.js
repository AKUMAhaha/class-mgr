import { json, handleCors, checkAdmin } from '../_lib.js';

export async function onRequest(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const ADMIN = env.ADMIN || 'teacher123';
  const cors = handleCors(context.request.method);
  if (cors) return cors;

  if (context.request.method === 'GET') {
    if (!checkAdmin(url, ADMIN)) return json({ error: 'forbidden' }, 403);
    const rows = await env.DB.prepare('SELECT sid, name, class_name, token_student, token_parent FROM students ORDER BY sid').all();
    return json(rows.results || []);
  }
  return json({ error: 'method not allowed' }, 405);
}
