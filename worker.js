/**
 * 大一新生班主任班级管理系统 — Cloudflare Worker 入口
 * 处理所有 /api/* 路由 + 托管静态前端文件（teacher.html / student.html / parent.html）
 *
 * 三种角色与鉴权：
 *  - 教师端：admin 凭证 (?admin=ADMIN，默认 teacher123)，可看/改全部数据
 *  - 学生端：密码登录 或 扫码 token_student，仅可看/改自己
 *  - 家长端：扫码 token_parent，仅可看自己孩子（只读）
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function nowMs() {
  return Date.now();
}

function checkAdmin(url, ADMIN) {
  return url.searchParams.get('admin') === ADMIN;
}

async function getStudent(DB, sid) {
  if (!sid) return null;
  return await DB.prepare('SELECT * FROM students WHERE sid = ?').bind(sid).first();
}

async function studentSession(DB, sid, t) {
  const stu = await getStudent(DB, sid);
  if (stu && stu.token_student === t) return stu;
  return null;
}

async function parentSession(DB, sid, t) {
  const stu = await getStudent(DB, sid);
  if (stu && stu.token_parent === t) return stu;
  return null;
}

async function authStudent(DB, url, ADMIN, sid) {
  const t = url.searchParams.get('t');
  const stu = await getStudent(DB, sid);
  if (!stu) return { error: '学号不存在', status: 404 };
  const isTeacher = checkAdmin(url, ADMIN);
  const isSelf = !!(await studentSession(DB, sid, t));
  const isParent = !!(await parentSession(DB, sid, t));
  if (!isTeacher && !isSelf && !isParent) return { error: 'forbidden', status: 403 };
  return { isTeacher, isSelf, isParent, student: stu };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const ADMIN = env.ADMIN || 'teacher123';

    // ---- CORS preflight ----
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // ================= API 路由 =================
    if (path.startsWith('/api/')) {
      try {
        // 教师登录
        if (path === '/api/teacher-login' && method === 'POST') {
          const { password } = await request.json();
          if (password === ADMIN) return json({ ok: true, role: 'teacher', admin: ADMIN });
          return json({ error: '密码错误' }, 401);
        }

        // 学生登录
        if (path === '/api/login' && method === 'POST') {
          const { sid, password } = await request.json();
          const stu = await getStudent(env.DB, sid);
          if (!stu) return json({ error: '该学号不在花名册内，无法登录' }, 404);
          if (stu.password !== password) return json({ error: '密码错误' }, 401);
          return json({
            ok: true, sid: stu.sid, name: stu.name, class_name: stu.class_name,
            needChange: stu.pwd_changed === 0, token_student: stu.token_student,
          });
        }

        // 改密码
        if (path === '/api/change-password' && method === 'POST') {
          const { sid, oldPassword, newPassword } = await request.json();
          if (!newPassword || newPassword.length < 4) return json({ error: '新密码至少 4 位' }, 400);
          const stu = await getStudent(env.DB, sid);
          if (!stu) return json({ error: '学号不存在' }, 404);
          if (stu.password !== oldPassword) return json({ error: '原密码错误' }, 401);
          await env.DB.prepare('UPDATE students SET password = ?, pwd_changed = 1 WHERE sid = ?').bind(newPassword, sid).run();
          return json({ ok: true });
        }

        // 学生 token 会话
        if (path === '/api/me' && method === 'GET') {
          const sid = url.searchParams.get('sid');
          const t = url.searchParams.get('t');
          const stu = await studentSession(env.DB, sid, t);
          if (!stu) return json({ error: '无效 token' }, 403);
          return json({ ok: true, sid: stu.sid, name: stu.name, class_name: stu.class_name, role: 'student' });
        }

        // 花名册（教师）
        if (path === '/api/students') {
          if (!checkAdmin(url, ADMIN)) return json({ error: 'forbidden' }, 403);
          if (method === 'POST') {
            const list = await request.json();
            if (!Array.isArray(list)) return json({ error: 'bad payload' }, 400);
            for (const item of list) {
              const sid = String(item.sid || '').trim();
              const name = String(item.name || '').trim();
              if (!sid || !name) continue;
              const exist = await getStudent(env.DB, sid);
              if (exist) {
                await env.DB.prepare('UPDATE students SET name = ?, class_name = ? WHERE sid = ?').bind(name, item.class_name || exist.class_name, sid).run();
              } else {
                await env.DB.prepare('INSERT INTO students (sid, name, password, pwd_changed, class_name, token_student, token_parent, created_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)')
                  .bind(sid, name, sid, item.class_name || '', crypto.randomUUID(), crypto.randomUUID(), nowMs()).run();
              }
            }
            return json({ ok: true, count: list.length });
          }
          const rows = await env.DB.prepare('SELECT sid, name, class_name, pwd_changed, token_student, token_parent FROM students ORDER BY sid').all();
          return json(rows.results || []);
        }

        // 课表
        if (path === '/api/schedule') {
          const sid = url.searchParams.get('sid');
          const auth = await authStudent(env.DB, url, ADMIN, sid);
          if (auth.error) return json({ error: auth.error }, auth.status);
          if (method === 'POST') {
            if (!auth.isTeacher && !auth.isSelf) return json({ error: 'forbidden' }, 403);
            const body = await request.json();
            await env.DB.prepare('INSERT OR REPLACE INTO schedules (sid, term, data) VALUES (?, ?, ?)').bind(sid, body.term || '', JSON.stringify(body.data || [])).run();
            return json({ ok: true });
          }
          const row = await env.DB.prepare('SELECT term, data FROM schedules WHERE sid = ?').bind(sid).first();
          return json(row ? { sid, term: row.term, data: JSON.parse(row.data || '[]') } : { sid, term: '', data: [] });
        }

        // 成绩
        if (path === '/api/scores') {
          const sid = url.searchParams.get('sid');
          const auth = await authStudent(env.DB, url, ADMIN, sid);
          if (auth.error) return json({ error: auth.error }, auth.status);
          if (method === 'POST') {
            if (!auth.isTeacher) return json({ error: '仅教师可上传成绩' }, 403);
            const body = await request.json();
            await env.DB.prepare('INSERT OR REPLACE INTO scores (sid, term, data) VALUES (?, ?, ?)').bind(sid, body.term || '', JSON.stringify(body.data || [])).run();
            return json({ ok: true });
          }
          const row = await env.DB.prepare('SELECT term, data FROM scores WHERE sid = ?').bind(sid).first();
          return json(row ? { sid, term: row.term, data: JSON.parse(row.data || '[]') } : { sid, term: '', data: [] });
        }

        // 档案
        if (path === '/api/profile') {
          const sid = url.searchParams.get('sid');
          const auth = await authStudent(env.DB, url, ADMIN, sid);
          if (auth.error) return json({ error: auth.error }, auth.status);
          if (method === 'POST') {
            if (!auth.isTeacher && !auth.isSelf) return json({ error: 'forbidden' }, 403);
            const body = await request.json();
            const exist = await env.DB.prepare('SELECT sid FROM profiles WHERE sid = ?').bind(sid).first();
            if (exist) {
              await env.DB.prepare('UPDATE profiles SET family = ?, psych = ?, updated_at = ? WHERE sid = ?').bind(JSON.stringify(body.family || {}), JSON.stringify(body.psych || {}), nowMs(), sid).run();
            } else {
              await env.DB.prepare('INSERT INTO profiles (sid, family, psych, updated_at) VALUES (?, ?, ?, ?)').bind(sid, JSON.stringify(body.family || {}), JSON.stringify(body.psych || {}), nowMs()).run();
            }
            return json({ ok: true });
          }
          const row = await env.DB.prepare('SELECT family, psych, updated_at FROM profiles WHERE sid = ?').bind(sid).first();
          return json(row ? { sid, family: JSON.parse(row.family || '{}'), psych: JSON.parse(row.psych || '{}'), updated_at: row.updated_at } : { sid, family: {}, psych: {}, updated_at: null });
        }

        // 月记录
        if (path === '/api/record') {
          const sid = url.searchParams.get('sid');
          const auth = await authStudent(env.DB, url, ADMIN, sid);
          if (auth.error) return json({ error: auth.error }, auth.status);
          if (method === 'POST') {
            if (!auth.isTeacher && !auth.isSelf) return json({ error: 'forbidden' }, 403);
            const b = await request.json();
            const month = b.month || url.searchParams.get('month') || '';
            if (!month) return json({ error: '缺少 month' }, 400);
            await env.DB.prepare('INSERT OR REPLACE INTO records (sid, month, learning_status, doubts, mood, relationship, life, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(sid, month, b.learning_status || '', b.doubts || '', b.mood || '', b.relationship || '', b.life || '', nowMs()).run();
            return json({ ok: true });
          }
          const month = url.searchParams.get('month');
          if (month) {
            const row = await env.DB.prepare('SELECT * FROM records WHERE sid = ? AND month = ?').bind(sid, month).first();
            return json(row || null);
          }
          const rows = await env.DB.prepare('SELECT * FROM records WHERE sid = ? ORDER BY month').bind(sid).all();
          return json(rows.results || []);
        }

        // 教师：全部月记录
        if (path === '/api/records-all' && method === 'GET') {
          if (!checkAdmin(url, ADMIN)) return json({ error: 'forbidden' }, 403);
          const rows = await env.DB.prepare('SELECT r.sid, r.month, r.learning_status, r.doubts, r.mood, r.relationship, r.life, s.name AS name FROM records r LEFT JOIN students s ON r.sid = s.sid ORDER BY r.sid, r.month').all();
          return json(rows.results || []);
        }

        // 家长端
        if (path === '/api/parent' && method === 'GET') {
          const sid = url.searchParams.get('sid');
          const t = url.searchParams.get('t');
          const stu = await parentSession(env.DB, sid, t);
          if (!stu) return json({ error: '无效或已过期的家长二维码' }, 403);
          const prof = await env.DB.prepare('SELECT family, psych, updated_at FROM profiles WHERE sid = ?').bind(sid).first();
          const sched = await env.DB.prepare('SELECT term, data FROM schedules WHERE sid = ?').bind(sid).first();
          const sc = await env.DB.prepare('SELECT term, data FROM scores WHERE sid = ?').bind(sid).first();
          const recs = await env.DB.prepare('SELECT * FROM records WHERE sid = ? ORDER BY month').bind(sid).all();
          return json({
            sid: stu.sid, name: stu.name, class_name: stu.class_name,
            family: prof ? JSON.parse(prof.family || '{}') : {},
            psych: prof ? JSON.parse(prof.psych || '{}') : {},
            schedule: sched ? { term: sched.term, data: JSON.parse(sched.data || '[]') } : { term: '', data: [] },
            scores: sc ? { term: sc.term, data: JSON.parse(sc.data || '[]') } : { term: '', data: [] },
            records: recs.results || [],
          });
        }

        // 二维码信息
        if (path === '/api/qr' && method === 'GET') {
          if (!checkAdmin(url, ADMIN)) return json({ error: 'forbidden' }, 403);
          const rows = await env.DB.prepare('SELECT sid, name, class_name, token_student, token_parent FROM students ORDER BY sid').all();
          return json(rows.results || []);
        }

        return json({ error: 'not found' }, 404);
      } catch (e) {
        return json({ error: e.message || 'internal error' }, 500);
      }
    }

    // ================= 静态文件托管 =================
    return env.ASSETS.fetch(request);
  },
};
