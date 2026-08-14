# -*- coding: utf-8 -*-
"""
大一新生班主任班级管理系统 — 二维码生成脚本
依赖：qrcode[pil]  (pip install "qrcode[pil]")

用法：
  1) 部署后，把下面 BASE_URL 改成你的实网域名（如 https://xxx.pages.dev）
  2) 生成三个终端入口码：
       python _gen_qr.py entry
  3) 生成每生专属码（学生码 + 家长码）：
       - 从教师端「每生二维码」页可逐个下载/打印；
       - 或导出花名册 CSV（含 token）后用：
       python _gen_qr.py students roster.csv
       CSV 表头：sid,name,token_student,token_parent
"""
import os, csv, qrcode

# ========== 部署后请修改此处 ==========
BASE_URL = "https://class-mgr.pages.dev"
# =====================================

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr")
os.makedirs(OUT, exist_ok=True)

def make(url, filename, label=""):
    img = qrcode.make(url, box_size=8, border=2)
    path = os.path.join(OUT, filename)
    img.save(path)
    print("  生成:", filename, "<- ", url)
    return path

def gen_entry():
    print("生成三个终端入口二维码 ->", OUT)
    make(BASE_URL + "/teacher.html", "entry_teacher.png", "教师端")
    make(BASE_URL + "/student.html",  "entry_student.png",  "学生端")
    make(BASE_URL + "/parent.html",   "entry_parent.png",   "家长端")

def gen_students(csv_path):
    print("从", csv_path, "生成每生专属二维码 ->", OUT)
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            sid = row.get("sid", "").strip()
            name = row.get("name", "").strip()
            ts = row.get("token_student", "").strip()
            tp = row.get("token_parent", "").strip()
            if not sid:
                continue
            if ts:
                make(BASE_URL + "/student.html?sid=" + sid + "&t=" + ts,
                     "student_%s.png" % sid, name + " 学生码")
            if tp:
                make(BASE_URL + "/parent.html?sid=" + sid + "&t=" + tp,
                     "parent_%s.png" % sid, name + " 家长码")
    print("完成。")

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "entry"
    if cmd == "entry":
        gen_entry()
    elif cmd == "students":
        if len(sys.argv) < 3:
            print("用法: python _gen_qr.py students roster.csv")
        else:
            gen_students(sys.argv[2])
    else:
        print("未知命令:", cmd)
