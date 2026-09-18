# 修正分类器后重新测量：先蓝后黑，黑线用更严的阈值
from PIL import Image

PATH = r"C:\Users\86181\.cursor\projects\c-Cursor-object-Project2\assets\c__Users_86181_AppData_Roaming_Cursor_User_workspaceStorage_f04e30410c42e4ade7a0f58fb08c868c_images_image-430a4974-7fd9-4567-b946-9565dbe312dc.png"

img = Image.open(PATH).convert("RGB")
w, h = img.size
px = img.load()


def classify(p):
    r, g, b = p
    if b > r + 30 and b > g + 20:
        return "B"  # 深蓝先判，避免被黑线阈值吃掉
    if max(r, g, b) < 90:
        return "K"  # 真正的黑线
    if r > g + 50 and r > b + 50:
        return "R"
    if r > 150 and g > 120 and b < 130:
        return "Y"
    return "W"


CW, CH = 60, 30
print("--- structure 60x30 ---")
for gy in range(CH):
    row = ""
    for gx in range(CW):
        counts = {}
        for sy in range(3):
            for sx in range(3):
                cx = min(w - 1, int((gx + (sx + 0.5) / 3) / CW * w))
                cy = min(h - 1, int((gy + (sy + 0.5) / 3) / CH * h))
                c = classify(px[cx, cy])
                counts[c] = counts.get(c, 0) + 1
        row += max(counts, key=counts.get)
    print(row)

# 黑线位置（修正后）
col_ratio = [sum(1 for y in range(h) if classify(px[x, y]) == "K") / h for x in range(w)]
row_ratio = [sum(1 for x in range(w) if classify(px[x, y]) == "K") / w for y in range(h)]


def peaks(ratios, thr):
    out = []
    in_line = False
    start = 0
    for i, r in enumerate(ratios):
        if r > thr and not in_line:
            in_line, start = True, i
        elif r <= thr and in_line:
            in_line = False
            out.append((start, i - 1))
    if in_line:
        out.append((start, len(ratios) - 1))
    return out


print("\nvertical lines (x0,x1,center%):", [(a, b, round((a + b) / 2 / w * 100, 1)) for a, b in peaks(col_ratio, 0.4)])
print("horizontal lines (y0,y1,center%):", [(a, b, round((a + b) / 2 / h * 100, 1)) for a, b in peaks(row_ratio, 0.4)])
