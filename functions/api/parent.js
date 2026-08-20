import { json, handleCors, getStudent } from '../_lib.js';

export async function onRequest(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const cors = handleCors(context.request.method);
  if (cors) return cors;

  if (context.request.method === 'GET') {
    const sid = url.searchParams.get('sid');
    const t = url.searchParams.get('t');
    const stu = await getStudent(env.DB, sid);
    if (!stu) return json({ error: '学号不存在' }, 404);
    if (t !== stu.token_student && t !== stu.token_parent) return json({ error: '无效或已过期的凭证' }, 403);

    const prof = await env.DB.prepare('SELECT family, psych, updated_at FROM profiles WHERE sid = ?').bind(sid).first();
    const sched = await env.DB.prepare('SELECT term, data FROM schedules WHERE sid = ?').bind(sid).first();
    const sc = await env.DB.prepare('SELECT term, data FROM scores WHERE sid = ?').bind(sid).first();
    const recs = await env.DB.prepare('SELECT * FROM records WHERE sid = ? ORDER BY month').bind(sid).all();

    return json({
      sid: stu.sid,
      name: stu.name,
      class_name: stu.class_name,
      family: prof ? JSON.parse(prof.family || '{}') : {},
      psych: prof ? JSON.parse(prof.psych || '{}') : {},
      schedule: sched ? { term: sched.term, data: JSON.parse(sched.data || '[]') } : { term: '', data: [] },
      scores: sc ? { term: sc.term, data: JSON.parse(sc.data || '[]') } : { term: '', data: [] },
      records: recs.results || [],
    });
  }
  return json({ error: 'method not allowed' }, 405);
}
