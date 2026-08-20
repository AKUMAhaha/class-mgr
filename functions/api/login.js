import { json, handleCors, getStudent } from '../_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  const cors = handleCors(request.method);
  if (cors) return cors;

  if (request.method === 'POST') {
    const { sid, name } = await request.json();
    const stu = await getStudent(env.DB, sid);
    if (!stu) return json({ error: '该学号不在花名册内，无法登录' }, 404);
    if ((stu.name || '').trim() !== (name || '').trim()) return json({ error: '姓名与学号不匹配' }, 401);
    return json({
      ok: true,
      sid: stu.sid,
      name: stu.name,
      class_name: stu.class_name,
      token_student: stu.token_student,
    });
  }
  return json({ error: 'method not allowed' }, 405);
}
