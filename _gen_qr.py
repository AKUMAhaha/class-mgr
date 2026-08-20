# -*- coding: utf-8 -*-
"""
大一新生班主任班级管理系统 — 二维码生成脚本
依赖：qrcode[pil]  (pip install "qrcode[pil]")

用法：
  1) 部署后，把下面 BASE_URL 改成你的实网域名（如 https://xxx.pages.dev）
  2) 生成三个终端统一入口码（教师端 / 学生端 / 家长端）：
       python _gen_qr.py entry
  说明：学生端与家长端各一个统一入口二维码，扫码进入登录页后用「姓名 + 学号」登录，
        不再为每个学生单独生成二维码。
"""
import os, csv, qrcode

# ========== 部署后请修改此处 ==========
BASE_URL = "https://class-mgr1.pages.dev"
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

# 注：学生端/家长端已统一为入口二维码（见 gen_entry），不再为每人单独生成专属码。

if __name__ == "__main__":
    gen_entry()
