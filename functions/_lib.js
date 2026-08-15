/**
 * 共享库：所有 API 路由文件的公共依赖
 * 提供 json()、checkAdmin、getStudent、studentSession、parentSession 等工具函数
 */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function nowMs() {
  return Date.now();
}

export function handleCors(method) {
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
  return null;
}

export function checkAdmin(url, ADMIN) {
  return url.searchParams.get('admin') === ADMIN;
}

export async function getStudent(DB, sid) {
  if (!sid) return null;
  return await DB.prepare('SELECT * FROM students WHERE sid = ?').bind(sid).first();
}

export async function studentSession(DB, sid, t) {
  const stu = await getStudent(DB, sid);
  if (stu && stu.token_student === t) return stu;
  return null;
}

export async function parentSession(DB, sid, t) {
  const stu = await getStudent(DB, sid);
  if (stu && stu.token_parent === t) return stu;
  return null;
}

/**
 * 鉴权包装器：验证请求者是否有权访问目标学生数据
 * 返回 { isTeacher, isSelf, isParent, student } 或 null（无权）
 */
export async function authStudent(DB, url, ADMIN, sid) {
  const t = url.searchParams.get('t');
  const stu = await getStudent(DB, sid);
  if (!stu) return { error: '学号不存在', status: 404 };
  const isTeacher = checkAdmin(url, ADMIN);
  const isSelf = !!(await studentSession(DB, sid, t));
  const isParent = !!(await parentSession(DB, sid, t));
  if (!isTeacher && !isSelf && !isParent) return { error: 'forbidden', status: 403 };
  return { isTeacher, isSelf, isParent, student: stu };
}
