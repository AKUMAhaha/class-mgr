import { json, handleCors, checkAdmin, getStudent } from '../_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ADMIN = env.ADMIN || 'teacher123';
  const cors = handleCors(request.method);
  if (cors) return cors;

  if (!checkAdmin(url, ADMIN)) return json({ error: 'forbidden' }, 403);

  if (request.method === 'POST') {
    const list = await request.json();
    if (!Array.isArray(list)) return json({ error: 'bad payload' }, 400);
    for (const item of list) {
      const sid = String(item.sid || '').trim();
      const name = String(item.name || '').trim();
      if (!sid || !name) continue;
      const exist = await getStudent(env.DB, sid);
      if (exist) {
        await env.DB.prepare('UPDATE students SET name = ?, class_name = ? WHERE sid = ?')
          .bind(name, item.class_name || exist.class_name, sid).run();
      } else {
        await env.DB.prepare(
          'INSERT INTO students (sid, name, password, pwd_changed, class_name, token_student, token_parent, created_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)'
        ).bind(sid, name, sid, item.class_name || '', crypto.randomUUID(), crypto.randomUUID(), Date.now()).run();
      }
    }
    return json({ ok: true, count: list.length });
  }

  // GET 列表
  const rows = await env.DB.prepare(
    'SELECT sid, name, class_name, pwd_changed, token_student, token_parent FROM students ORDER BY sid'
  ).all();
  return json(rows.results || []);
}
