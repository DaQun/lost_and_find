#!/usr/bin/env python3
"""
生成 Lost & Find TabBar 图标
输出 6 个 81×81 RGBA PNG 文件到 src/static/icons/
  home.png / home-active.png
  message.png / message-active.png
  profile.png / profile-active.png
"""

import struct
import zlib
import math
import os

# ── 颜色 ─────────────────────────────────────────────────────────────────────
GRAY = (156, 163, 175, 255)   # #9CA3AF  默认
BLUE = (59,  130, 246, 255)   # #3B82F6  选中

SIZE = 81   # 图标尺寸 px


# ── PNG 编码 ──────────────────────────────────────────────────────────────────

def make_png(pixels: list[list[tuple]]) -> bytes:
    """pixels[y][x] = (R, G, B, A)，输出 PNG bytes。"""
    h = len(pixels)
    w = len(pixels[0])

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    # IHDR: RGBA color type 6
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))

    raw = b''
    for row in pixels:
        raw += b'\x00'  # filter None
        for r, g, b, a in row:
            raw += bytes([r, g, b, a])
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')

    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend


# ── 画布工具 ──────────────────────────────────────────────────────────────────

def new_canvas(size=SIZE):
    return [[(0, 0, 0, 0)] * size for _ in range(size)]


def _blend(canvas, x, y, color, alpha):
    if 0 <= x < len(canvas[0]) and 0 <= y < len(canvas):
        r, g, b, _ = color
        canvas[y][x] = (r, g, b, max(canvas[y][x][3], int(alpha * 255)))


def draw_circle(canvas, cx, cy, radius, color):
    for y in range(int(cy - radius) - 1, int(cy + radius) + 2):
        for x in range(int(cx - radius) - 1, int(cx + radius) + 2):
            d = math.hypot(x - cx, y - cy)
            if d < radius - 0.5:
                _blend(canvas, x, y, color, 1.0)
            elif d < radius + 0.5:
                _blend(canvas, x, y, color, radius + 0.5 - d)


def draw_rect(canvas, x1, y1, x2, y2, color):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            if 0 <= x < len(canvas[0]) and 0 <= y < len(canvas):
                canvas[y][x] = color


def draw_rounded_rect(canvas, x1, y1, x2, y2, r, color):
    draw_rect(canvas, x1 + r, y1,     x2 - r, y2,     color)
    draw_rect(canvas, x1,     y1 + r, x2,     y2 - r, color)
    draw_circle(canvas, x1 + r, y1 + r, r, color)
    draw_circle(canvas, x2 - r, y1 + r, r, color)
    draw_circle(canvas, x1 + r, y2 - r, r, color)
    draw_circle(canvas, x2 - r, y2 - r, r, color)


def draw_triangle(canvas, pts, color):
    pts = sorted(pts, key=lambda p: p[1])
    (x0, y0), (x1, y1), (x2, y2) = [(float(px), float(py)) for px, py in pts]

    def interp(y, ay, ax, by, bx):
        if by == ay:
            return ax
        return ax + (bx - ax) * (y - ay) / (by - ay)

    for y in range(int(math.ceil(y0)), int(math.floor(y2)) + 1):
        if y <= y1:
            xa = interp(y, y0, x0, y1, x1)
            xb = interp(y, y0, x0, y2, x2)
        else:
            xa = interp(y, y1, x1, y2, x2)
            xb = interp(y, y0, x0, y2, x2)
        for x in range(int(math.floor(min(xa, xb))), int(math.ceil(max(xa, xb))) + 1):
            if 0 <= x < len(canvas[0]) and 0 <= y < len(canvas):
                canvas[y][x] = color


# ── 图标绘制 ──────────────────────────────────────────────────────────────────

def icon_home(color):
    """🏠 房子：三角屋顶 + 矩形主体 + 门洞"""
    c = new_canvas()
    s = SIZE

    # 屋顶三角
    roof = [(s // 2, 10), (8, 40), (s - 8, 40)]
    draw_triangle(c, roof, color)

    # 主体
    draw_rounded_rect(c, 18, 38, s - 18, s - 12, 4, color)

    # 门洞（透明挖空）
    transparent = (0, 0, 0, 0)
    draw_rect(c, 30, 50, 50, s - 12, transparent)

    return c


def icon_message(color):
    """💬 气泡：圆角矩形 + 小尾巴"""
    c = new_canvas()
    s = SIZE

    # 主气泡
    draw_rounded_rect(c, 8, 10, s - 8, s - 28, 12, color)

    # 尾巴三角（左下角）
    tail = [(18, s - 27), (10, s - 10), (38, s - 27)]
    draw_triangle(c, tail, color)

    return c


def icon_profile(color):
    """👤 人物：圆形头部 + 半圆形身体"""
    c = new_canvas()
    s = SIZE

    # 头部
    draw_circle(c, s / 2, 24, 14, color)

    # 身体：宽肩圆角矩形（底部超出画布产生半圆感）
    draw_rounded_rect(c, 12, 46, s - 12, s - 8, 20, color)

    return c


# ── 主程序 ────────────────────────────────────────────────────────────────────

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(script_dir, '..', 'src', 'static', 'icons')
    os.makedirs(out_dir, exist_ok=True)

    icons = [
        ('home',            icon_home,    GRAY),
        ('home-active',     icon_home,    BLUE),
        ('message',         icon_message, GRAY),
        ('message-active',  icon_message, BLUE),
        ('profile',         icon_profile, GRAY),
        ('profile-active',  icon_profile, BLUE),
    ]

    for name, fn, color in icons:
        canvas = fn(color)
        data = make_png(canvas)
        path = os.path.join(out_dir, f'{name}.png')
        with open(path, 'wb') as f:
            f.write(data)
        print(f'✅  {name}.png  ({len(data):,} bytes)')

    print(f'\n图标已写入 {os.path.abspath(out_dir)}')


if __name__ == '__main__':
    main()
