import { json, handleCors, getStudent } from '../_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  const cors = handleCors(request.method);
  if (cors) return cors;

  if (request.method === 'POST') {
    const { sid, oldPassword, newPassword } = await request.json();
    if (!newPassword || newPassword.length < 4) return json({ error: '新密码至少 4 位' }, 400);
    const stu = await getStudent(env.DB, sid);
    if (!stu) return json({ error: '学号不存在' }, 404);
    if (stu.password !== oldPassword) return json({ error: '原密码错误' }, 401);
    await env.DB.prepare(
      'UPDATE students SET password = ?, pwd_changed = 1 WHERE sid = ?'
    ).bind(newPassword, sid).run();
    return json({ ok: true });
  }
  return json({ error: 'method not allowed' }, 405);
}
