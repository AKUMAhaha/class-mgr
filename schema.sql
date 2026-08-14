-- 大一新生班主任班级管理系统 D1 Schema
-- 关系型存储：学生 / 档案(家庭+心理) / 课表 / 成绩 / 每月学习情况记录

CREATE TABLE IF NOT EXISTS students (
  sid            TEXT PRIMARY KEY,        -- 学号
  name           TEXT NOT NULL,           -- 姓名
  password       TEXT NOT NULL,           -- 登录密码（初始=学号）
  pwd_changed    INTEGER NOT NULL DEFAULT 0, -- 0=首次未改密 1=已改
  class_name     TEXT,                    -- 班级
  token_student  TEXT NOT NULL,           -- 学生专属二维码 token（可填/看自己）
  token_parent   TEXT NOT NULL,           -- 家长专属二维码 token（仅看自己孩子）
  created_at     INTEGER
);

CREATE TABLE IF NOT EXISTS profiles (
  sid         TEXT PRIMARY KEY,
  family      TEXT,   -- JSON：家庭情况
  psych       TEXT,   -- JSON：心理情况
  updated_at  INTEGER
);

CREATE TABLE IF NOT EXISTS schedules (
  sid   TEXT PRIMARY KEY,
  term  TEXT,    -- 学期，如 2026-2027-1
  data  TEXT     -- JSON 数组：[{day,period,course,room}, ...]
);

CREATE TABLE IF NOT EXISTS scores (
  sid   TEXT PRIMARY KEY,
  term  TEXT,
  data  TEXT     -- JSON 数组：[{course, score, credit}, ...]
);

CREATE TABLE IF NOT EXISTS records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sid            TEXT NOT NULL,
  month          TEXT NOT NULL,   -- 如 2026-09
  learning_status TEXT,          -- 学习状态
  doubts         TEXT,            -- 疑惑
  mood           TEXT,            -- 心情
  relationship   TEXT,            -- 恋爱状态
  life           TEXT,            -- 生活
  created_at     INTEGER,
  UNIQUE(sid, month)
);

CREATE INDEX IF NOT EXISTS idx_records_sid ON records(sid);
CREATE INDEX IF NOT EXISTS idx_records_month ON records(month);
