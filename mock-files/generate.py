#!/usr/bin/env python3
"""Builds the sample files the mock account downloads (see src/data/mock.ts).

The mock data links to these files on GitHub, so file previews show real
content of the right type. All content here is made up for the mock courses.

Needs python-docx, python-pptx, openpyxl, Pillow and numpy, LibreOffice
(`soffice`) for the PDFs, ffmpeg for the video and a CJK font
(WenQuanYi Zen Hei by default, or set CJK_FONT to a font file).

    python3 mock-files/generate.py
"""

import io
import math
import os
import shutil
import struct
import subprocess
import tempfile
import wave
import zipfile

import numpy as np
from docx import Document
from docx.shared import Pt
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Emu, Inches
from pptx.util import Pt as PPt

OUT = os.path.dirname(os.path.abspath(__file__))
FONT_FILE = os.environ.get(
    "CJK_FONT", "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
)
FONT_NAME = "WenQuanYi Zen Hei"
PURPLE = RGBColor(0x66, 0x08, 0x74)


def font(size):
    return ImageFont.truetype(FONT_FILE, size)


def soffice_pdf(src, name):
    """Converts an Office file to PDF with LibreOffice, saved as `name`."""
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, src],
            check=True,
            capture_output=True,
        )
        pdf = os.path.join(tmp, os.path.splitext(os.path.basename(src))[0] + ".pdf")
        shutil.move(pdf, os.path.join(OUT, name))


# --- Charts drawn with Pillow ------------------------------------------------


def axes(draw, box, xlabel, ylabel, xticks, yticks):
    left, top, right, bottom = box
    draw.line([(left, top), (left, bottom), (right, bottom)], fill="#333", width=3)
    small = font(26)
    for value, x in xticks:
        draw.line([(x, bottom), (x, bottom + 10)], fill="#333", width=2)
        draw.text((x, bottom + 16), value, fill="#333", font=small, anchor="mt")
    for value, y in yticks:
        draw.line([(left - 10, y), (left, y)], fill="#333", width=2)
        draw.text((left - 16, y), value, fill="#333", font=small, anchor="rm")
    draw.text(((left + right) / 2, bottom + 60), xlabel, fill="#333", font=font(28), anchor="mt")
    draw.text((left - 100, top - 70), ylabel, fill="#333", font=font(28), anchor="ls")


def cone_chart():
    """Schematic cone sensitivities (Gaussian approximations)."""
    w, h = 1400, 820
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    box = (140, 150, 1340, 680)
    lo, hi = 380, 720
    x = lambda nm: box[0] + (nm - lo) / (hi - lo) * (box[2] - box[0])
    y = lambda v: box[3] - v * (box[3] - box[1])
    axes(
        d,
        box,
        "波长 / nm",
        "相对灵敏度",
        [(str(nm), x(nm)) for nm in range(400, 721, 50)],
        [(f"{v:.1f}", y(v)) for v in (0, 0.5, 1.0)],
    )
    for name, peak, width, color, anchor, dx in (
        ("S", 420, 30, "#3b5bdb", "ms", 0),
        ("M", 534, 45, "#2f9e44", "rs", -10),
        ("L", 564, 50, "#e03131", "ls", 10),
    ):
        pts = [(x(nm), y(math.exp(-((nm - peak) / width) ** 2 / 2))) for nm in range(lo, hi + 1, 2)]
        d.line(pts, fill=color, width=5)
        d.text((x(peak) + dx, y(1.0) - 14), f"{name} {peak} nm", fill=color, font=font(28), anchor=anchor)
    d.text((box[2], box[1] - 70), "示意图", fill="#888", font=font(24), anchor="rt")
    return img


def timing_diagram():
    """A small synchronous counter's timing diagram."""
    w, h = 1600, 760
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.text((w / 2, 40), "4 位同步计数器时序图", fill="#222", font=font(40), anchor="mt")
    rows = ["CLK", "RST_N", "EN", "Q[0]", "Q[1]", "Q[2]", "Q[3]"]
    left, step, top, gap, high = 200, 80, 140, 85, 44
    cycles = 16
    for i, name in enumerate(rows):
        base = top + i * gap + high
        d.text((left - 30, base - high / 2), name, fill="#222", font=font(30), anchor="rm")
        pts = []
        for t in range(cycles * 2 + 1):
            xpos = left + t * step / 2
            if name == "CLK":
                level = t % 2 == 0
            elif name == "RST_N":
                level = t >= 2
            elif name == "EN":
                level = t >= 4
            else:
                bit = int(name[2])
                count = max(0, (t - 4) // 2 + 1) if t >= 4 else 0
                level = (count >> bit) & 1
            yv = base - high if level else base
            if pts:
                pts.append((xpos, pts[-1][1]))
            pts.append((xpos, yv))
        d.line(pts, fill="#660874" if name.startswith("Q") else "#1c7ed6", width=4)
    for t in range(0, cycles + 1, 2):
        xpos = left + t * step
        d.line([(xpos, top - 10), (xpos, top + len(rows) * gap)], fill="#ddd", width=1)
    return img


def sine_burst(freqs, seconds=0.4, rate=8000):
    t = np.arange(int(seconds * rate)) / rate
    signal = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    return (signal * 0.6 * 32767).astype("<i2").tobytes(), rate


def wav_bytes(frames, rate):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(frames)
    return buf.getvalue()


# --- Files ---------------------------------------------------------------------


def slides(path, title, subtitle, pages):
    """A 16:9 lecture deck; each page is (title, bullets, image or None)."""
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)

    def text(frame, value, size, bold=False, color=None):
        frame.text = value
        for p in frame.paragraphs:
            for r in p.runs:
                r.font.size = PPt(size)
                r.font.bold = bold
                r.font.name = FONT_NAME
                if color:
                    r.font.color.rgb = color

    cover = prs.slides.add_slide(prs.slide_layouts[6])
    band = cover.shapes.add_shape(1, 0, Inches(2.6), prs.slide_width, Inches(2.4))
    band.fill.solid()
    band.fill.fore_color.rgb = PURPLE
    band.line.fill.background()
    box = cover.shapes.add_textbox(Inches(0.8), Inches(2.9), Inches(11.7), Inches(1.2))
    text(box.text_frame, title, 44, True, RGBColor(255, 255, 255))
    box = cover.shapes.add_textbox(Inches(0.8), Inches(4.0), Inches(11.7), Inches(0.8))
    text(box.text_frame, subtitle, 24, False, RGBColor(255, 255, 255))

    for number, (heading, bullets, image) in enumerate(pages, start=2):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        bar = slide.shapes.add_shape(1, 0, 0, prs.slide_width, Inches(0.18))
        bar.fill.solid()
        bar.fill.fore_color.rgb = PURPLE
        bar.line.fill.background()
        box = slide.shapes.add_textbox(Inches(0.7), Inches(0.45), Inches(12), Inches(0.9))
        text(box.text_frame, heading, 34, True, PURPLE)
        width = Inches(6.2) if image else Inches(11.8)
        box = slide.shapes.add_textbox(Inches(0.7), Inches(1.6), width, Inches(5.2))
        frame = box.text_frame
        frame.word_wrap = True
        for i, bullet in enumerate(bullets):
            p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
            p.text = "• " + bullet
            p.space_after = PPt(14)
            for r in p.runs:
                r.font.size = PPt(22)
                r.font.name = FONT_NAME
        if image is not None:
            buf = io.BytesIO()
            image.save(buf, "PNG")
            buf.seek(0)
            slide.shapes.add_picture(buf, Inches(7.1), Inches(1.7), width=Inches(5.8))
        foot = slide.shapes.add_textbox(Inches(12.2), Inches(6.9), Inches(1), Inches(0.4))
        text(foot.text_frame, str(number), 14, False, RGBColor(0x88, 0x88, 0x88))
    prs.save(path)


def visual_system_pdf(tmp):
    pptx = os.path.join(tmp, "human-visual-system.pptx")
    slides(
        pptx,
        "第 7 讲  人类视觉系统",
        "视听信息系统导论 · 2026 秋",
        [
            ("本讲内容", ["眼睛的光学结构", "视网膜与感光细胞", "颜色视觉与三色理论", "亮度感知与对比度", "对图像与视频编码的启示"], None),
            ("眼睛的光学结构", ["角膜与晶状体共同完成成像，晶状体可调节焦距", "瞳孔直径约 2–8 mm，随光照自动调节", "成像落在视网膜上，中央凹处视锐度最高"], None),
            ("视网膜与感光细胞", ["视杆细胞：约 1.2 亿个，弱光下工作，不分辨颜色", "视锥细胞：约 600 万个，集中于中央凹，负责颜色视觉", "感光信号经双极细胞、神经节细胞传入视神经"], None),
            ("三种视锥细胞的光谱灵敏度", ["S、M、L 三类视锥细胞峰值分别位于短、中、长波段", "任意颜色可由三种响应的组合表示：三色理论", "这是 RGB 显示与 XYZ 色彩空间的生理基础"], cone_chart()),
            ("亮度感知", ["人眼对亮度的响应近似对数关系（韦伯–费希纳定律）", "恰可察觉差 ΔI/I 在较大范围内近似为常数", "马赫带效应：边缘处感知亮度被增强"], None),
            ("对编码的启示", ["人眼对亮度比对色度更敏感 → YCbCr 4:2:0 采样", "对高频细节不敏感 → 变换编码中的量化矩阵", "伽马校正使量化误差在感知上更均匀"], None),
            ("课后思考", ["为什么夜间难以分辨颜色？", "若人眼只有两类视锥细胞，色彩空间需要几维？", "阅读：教材第 3 章 3.1–3.4 节"], None),
        ],
    )
    soffice_pdf(pptx, "human-visual-system.pdf")


def ml_pptx():
    slides(
        os.path.join(OUT, "deep-learning-frameworks.pptx"),
        "第 9 讲  深度学习框架",
        "机器学习概论 · 2026 秋",
        [
            ("为什么需要框架", ["张量运算在 GPU 上高效执行", "自动微分：只写前向计算，梯度自动求出", "常用模块（层、优化器、数据加载）开箱即用"], None),
            ("计算图与自动微分", ["前向计算时记录运算，构成有向无环图", "反向传播沿计算图应用链式法则", "动态图便于调试，静态图便于优化与部署"], None),
            ("一个训练循环", ["for x, y in loader:", "    loss = criterion(model(x), y)", "    optimizer.zero_grad(); loss.backward(); optimizer.step()"], None),
            ("课后练习", ["用框架重新实现第 7 讲的多层感知机", "比较 SGD 与 Adam 在 MNIST 上的收敛速度"], None),
        ],
    )


def handout_pdf(tmp):
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = FONT_NAME
    style.font.size = Pt(11)
    doc.add_heading("第一次大作业：利用灭点灭线估计建筑物高度", level=1)
    doc.add_paragraph("视听信息系统导论 · 2026 秋")
    doc.add_heading("一、背景", level=2)
    doc.add_paragraph(
        "单张图像丢失了深度信息，但场景中的平行线在图像上会交于灭点。利用两个水平方向的灭点可以求出地平线（灭线），"
        "再结合一个已知高度的参照物，就能根据交比关系估计其他竖直物体的高度。"
    )
    doc.add_heading("二、任务", level=2)
    for item in (
        "在校园内拍摄一张包含至少两栋建筑的照片，要求能看到地面上的平行线。",
        "手动或自动检测平行线，求出两个水平灭点和竖直灭点，画出灭线。",
        "以照片中一名同学（或已知高度的物体）为参照，估计建筑物高度，并与实际值比较。",
        "分析误差来源，讨论镜头畸变与灭点检测误差的影响。",
    ):
        doc.add_paragraph(item, style="List Number")
    doc.add_heading("三、提交要求", level=2)
    doc.add_paragraph("以小组为单位（不超过 3 人）提交报告 PDF 与代码压缩包，报告不超过 8 页。")
    table = doc.add_table(rows=1, cols=2)
    table.style = "Light Grid Accent 1"
    table.rows[0].cells[0].text = "评分项"
    table.rows[0].cells[1].text = "比例"
    for name, weight in (("灭点与灭线求解", "30%"), ("高度估计与误差分析", "40%"), ("报告与代码质量", "30%")):
        row = table.add_row().cells
        row[0].text, row[1].text = name, weight
    path = os.path.join(tmp, "project1-handout.docx")
    doc.save(path)
    soffice_pdf(path, "project1-handout.pdf")


def solution_pdf(tmp):
    doc = Document()
    doc.styles["Normal"].font.name = FONT_NAME
    doc.add_heading("概率论与随机过程(2)  第 6 次作业", level=1)
    for title, body in (
        ("第 1 题", "X(t) = A cos(ωt + Θ)，Θ 在 [0, 2π) 上均匀分布。E[X(t)] = 0，R_X(t1, t2) = (A²/2) cos ω(t1 − t2)，只与时间差有关，故 X(t) 为广义平稳过程。"),
        ("第 2 题", "泊松过程 N(t) 的强度为 λ = 3。P{N(2) = 4} = e^(−6) · 6⁴ / 4! ≈ 0.134。"),
        ("第 3 题", "由切普曼–柯尔莫哥洛夫方程 P(2) = P²，求得两步转移概率矩阵，平稳分布为 π = (0.4, 0.35, 0.25)。"),
    ):
        doc.add_heading(title, level=2)
        doc.add_paragraph(body)
    path = os.path.join(tmp, "homework-solution.docx")
    doc.save(path)
    soffice_pdf(path, "homework-solution.pdf")


def lab_template_docx():
    doc = Document()
    doc.styles["Normal"].font.name = FONT_NAME
    doc.add_heading("电子系统设计  实验报告", level=1)
    table = doc.add_table(rows=3, cols=4)
    table.style = "Table Grid"
    for r, (a, b) in enumerate((("实验名称", "组号"), ("姓名", "学号"), ("实验日期", "指导教师"))):
        table.cell(r, 0).text = a
        table.cell(r, 2).text = b
    for heading in ("一、实验目的", "二、实验原理", "三、实验电路与器件", "四、实验数据与波形", "五、结果分析与讨论", "六、心得体会"):
        doc.add_heading(heading, level=2)
        doc.add_paragraph("（请在此填写）")
    doc.save(os.path.join(OUT, "lab-report-template.docx"))


def measurement_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "FIR 滤波器测量"
    ws.append(["频率 (Hz)", "输入幅度 (V)", "输出幅度 (V)", "增益 (dB)", "备注"])
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="660874")
        cell.alignment = Alignment(horizontal="center")
    for f in (100, 200, 500, 800, 1000, 1200, 1500, 2000, 3000, 4000):
        gain = 1 / math.sqrt(1 + (f / 1000) ** 8)
        row = ws.max_row + 1
        ws.append([f, 1.0, round(gain, 3), f"=20*LOG10(C{row}/B{row})", "截止频率附近" if f == 1000 else ""])
    for col, width in zip("ABCDE", (12, 14, 14, 12, 16)):
        ws.column_dimensions[col].width = width
    wb.save(os.path.join(OUT, "fir-measurements.xlsx"))


def dtmf_zip():
    low = (697, 770, 852, 941)
    high = (1209, 1336, 1477)
    keys = "123456789*0#"
    with zipfile.ZipFile(os.path.join(OUT, "dtmf-signals.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        for i, key in enumerate(keys):
            frames, rate = sine_burst((low[i // 3], high[i % 3]))
            name = {"*": "star", "#": "pound"}.get(key, key)
            z.writestr(f"dtmf-signals/key_{name}.wav", wav_bytes(frames, rate))
        z.writestr("dtmf-signals/readme.txt", "8 kHz, 16-bit mono. One file per key, 0.4 s each.\n")


def timing_png():
    timing_diagram().save(os.path.join(OUT, "counter-timing.png"), optimize=True)


def scope_mp4():
    """An oscilloscope-style clip of a slowly beating pair of tones."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
            "-f", "lavfi", "-i", "sine=frequency=443:duration=6",
            "-filter_complex",
            "[0][1]amix=inputs=2,showwaves=s=960x540:mode=line:rate=25:colors=0x55ff88,format=yuv420p[v]",
            "-map", "[v]", "-c:v", "libx264", "-crf", "30", "-movflags", "+faststart",
            os.path.join(OUT, "scope-demo.mp4"),
        ],
        check=True,
    )


def main():
    with tempfile.TemporaryDirectory() as tmp:
        visual_system_pdf(tmp)
        handout_pdf(tmp)
        solution_pdf(tmp)
    ml_pptx()
    lab_template_docx()
    measurement_xlsx()
    dtmf_zip()
    timing_png()
    scope_mp4()
    for name in sorted(os.listdir(OUT)):
        if name != os.path.basename(__file__):
            print(f"{name}\t{os.path.getsize(os.path.join(OUT, name))}")


if __name__ == "__main__":
    main()
