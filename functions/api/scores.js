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
    if (!auth.isTeacher && !auth.isSelf) return json({ error: '仅教师或本人可录入成绩' }, 403);
    const body = await request.json();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO scores (sid, term, data) VALUES (?, ?, ?)'
    ).bind(sid, body.term || '', JSON.stringify(body.data || [])).run();
    return json({ ok: true });
  }

  const row = await env.DB.prepare('SELECT term, data FROM scores WHERE sid = ?').bind(sid).first();
  return json(row ? { sid, term: row.term, data: JSON.parse(row.data || '[]') } : { sid, term: '', data: [] });
}
