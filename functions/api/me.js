import { json, handleCors, studentSession } from '../_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cors = handleCors(request.method);
  if (cors) return cors;

  if (request.method === 'GET') {
    const sid = url.searchParams.get('sid');
    const t = url.searchParams.get('t');
    const stu = await studentSession(env.DB, sid, t);
    if (!stu) return json({ error: '无效 token' }, 403);
    return json({ ok: true, sid: stu.sid, name: stu.name, class_name: stu.class_name, role: 'student' });
  }
  return json({ error: 'method not allowed' }, 405);
}
