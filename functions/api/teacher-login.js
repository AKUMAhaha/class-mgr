import { json, handleCors } from '../_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  const ADMIN = env.ADMIN || 'teacher123';
  const cors = handleCors(request.method);
  if (cors) return cors;

  if (request.method === 'POST') {
    const { password } = await request.json();
    if (password === ADMIN) return json({ ok: true, role: 'teacher', admin: ADMIN });
    return json({ error: '密码错误' }, 401);
  }
  return json({ error: 'method not allowed' }, 405);
}
