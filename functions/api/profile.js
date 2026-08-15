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
    const body = await request.json();
    const exist = await env.DB.prepare('SELECT sid FROM profiles WHERE sid = ?').bind(sid).first();
    if (exist) {
      await env.DB.prepare('UPDATE profiles SET family = ?, psych = ?, updated_at = ? WHERE sid = ?')
        .bind(JSON.stringify(body.family || {}), JSON.stringify(body.psych || {}), Date.now(), sid).run();
    } else {
      await env.DB.prepare('INSERT INTO profiles (sid, family, psych, updated_at) VALUES (?, ?, ?, ?)')
        .bind(sid, JSON.stringify(body.family || {}), JSON.stringify(body.psych || {}), Date.now()).run();
    }
    return json({ ok: true });
  }

  const row = await env.DB.prepare('SELECT family, psych, updated_at FROM profiles WHERE sid = ?').bind(sid).first();
  return json(row
    ? { sid, family: JSON.parse(row.family || '{}'), psych: JSON.parse(row.psych || '{}'), updated_at: row.updated_at }
    : { sid, family: {}, psych: {}, updated_at: null });
}
