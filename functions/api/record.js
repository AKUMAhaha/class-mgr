import { json, handleCors, authStudent } from '../_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ADMIN = env.ADMIN || 'teacher123';
  const cors = handleCors(request.method);
  if (cors) return cors;

  const sid = url.searchParams.get('sid');
  const auth = await authStudent(env.DB, url, ADMIN, sid);
  if (auth.error) return json({ error: auth.error }, auth.status);

  if (request.method === 'POST') {
    if (!auth.isTeacher && !auth.isSelf) return json({ error: 'forbidden' }, 403);
    const b = await request.json();
    const month = b.month || url.searchParams.get('month') || '';
    if (!month) return json({ error: '缺少 month' }, 400);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO records (sid, month, learning_status, doubts, mood, relationship, life, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(sid, month, b.learning_status || '', b.doubts || '', b.mood || '', b.relationship || '', b.life || '', Date.now()).run();
    return json({ ok: true });
  }

  // GET
  const month = url.searchParams.get('month');
  if (month) {
    const row = await env.DB.prepare('SELECT * FROM records WHERE sid = ? AND month = ?').bind(sid, month).first();
    return json(row || null);
  }
  const rows = await env.DB.prepare('SELECT * FROM records WHERE sid = ? ORDER BY month').bind(sid).all();
  return json(rows.results || []);
}
