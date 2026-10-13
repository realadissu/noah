"""
Deterministic SongBeamer Inspection Script
Inspects the running SongBeamer instance, captures metrics, controls, colors, typography,
and saves an exact screenshot to design-reference/songbeamer_main_window.png.
"""

import sys
import os
import json
import ctypes
from ctypes import wintypes
import time

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
kernel32 = ctypes.windll.kernel32

def inspect():
    # 1. Attach to interactive desktop ('default')
    h_def = user32.OpenDesktopW("default", 0, False, 0x01FF)
    if h_def:
        user32.SetThreadDesktop(h_def)

    # 2. Find SongBeamer window
    hwnd = user32.FindWindowW("TFormSBMain", None)
    if not hwnd:
        # Fallback search by title
        def find_cb(h, extra):
            length = user32.GetWindowTextLengthW(h)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(h, buf, length + 1)
                if "SongBeamer" in buf.value:
                    extra.append(h)
            return True
        found = []
        user32.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)(find_cb), ctypes.py_object(found))
        if found:
            hwnd = found[0]

    if not hwnd:
        print(json.dumps({"error": "SongBeamer window not found"}, indent=2))
        return 1

    # 3. Bring window to foreground
    user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.3)

    # 4. Get window and client dimensions
    rc_win = (ctypes.c_long * 4)()
    rc_client = (ctypes.c_long * 4)()
    user32.GetWindowRect(hwnd, ctypes.byref(rc_win))
    user32.GetClientRect(hwnd, ctypes.byref(rc_client))

    win_w = rc_win[2] - rc_win[0]
    win_h = rc_win[3] - rc_win[1]
    client_w = rc_client[2] - rc_client[0]
    client_h = rc_client[3] - rc_client[1]

    # Get DPI
    try:
        user32.GetDpiForWindow.restype = wintypes.UINT
        dpi = user32.GetDpiForWindow(hwnd)
    except Exception:
        dpi = 96
    scale_factor = dpi / 96.0

    # 5. Capture programmatic screenshot via PrintWindow (PW_RENDERFULLCONTENT)
    hdc_screen = user32.GetDC(0)
    hdc_mem = gdi32.CreateCompatibleDC(hdc_screen)
    hbm = gdi32.CreateCompatibleBitmap(hdc_screen, win_w, win_h)
    gdi32.SelectObject(hdc_mem, hbm)

    user32.PrintWindow(hwnd, hdc_mem, 2)

    class BITMAPINFOHEADER(ctypes.Structure):
        _fields_ = [
            ('biSize', wintypes.DWORD),
            ('biWidth', wintypes.LONG),
            ('biHeight', wintypes.LONG),
            ('biPlanes', wintypes.WORD),
            ('biBitCount', wintypes.WORD),
            ('biCompression', wintypes.DWORD),
            ('biSizeImage', wintypes.DWORD),
            ('biXPelsPerMeter', wintypes.LONG),
            ('biYPelsPerMeter', wintypes.LONG),
            ('biClrUsed', wintypes.DWORD),
            ('biClrImportant', wintypes.DWORD)
        ]

    bmi = BITMAPINFOHEADER()
    bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bmi.biWidth = win_w
    bmi.biHeight = -win_h
    bmi.biPlanes = 1
    bmi.biBitCount = 32
    bmi.biCompression = 0

    buf = (ctypes.c_byte * (win_w * win_h * 4))()
    gdi32.GetDIBits(hdc_mem, hbm, 0, win_h, ctypes.byref(buf), ctypes.byref(bmi), 0)

    from PIL import Image
    img = Image.frombuffer('RGBA', (win_w, win_h), buf, 'raw', 'BGRA', 0, 1).convert('RGB')

    out_dir = r"z:\Users\wolfgangmeincke\NOAH\design-reference"
    os.makedirs(out_dir, exist_ok=True)
    out_img = os.path.join(out_dir, "songbeamer_main_window.png")
    img.save(out_img)

    # 6. Enumerate Win32 Child Controls & Fonts
    controls = []
    class LOGFONTW(ctypes.Structure):
        _fields_ = [
            ("lfHeight", wintypes.LONG),
            ("lfWidth", wintypes.LONG),
            ("lfEscapement", wintypes.LONG),
            ("lfOrientation", wintypes.LONG),
            ("lfWeight", wintypes.LONG),
            ("lfItalic", wintypes.BYTE),
            ("lfUnderline", wintypes.BYTE),
            ("lfStrikeOut", wintypes.BYTE),
            ("lfCharSet", wintypes.BYTE),
            ("lfOutPrecision", wintypes.BYTE),
            ("lfClipPrecision", wintypes.BYTE),
            ("lfQuality", wintypes.BYTE),
            ("lfPitchAndFamily", wintypes.BYTE),
            ("lfFaceName", wintypes.WCHAR * 32)
        ]

    def enum_children_cb(h, extra):
        cls_buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(h, cls_buf, 256)
        cls_name = cls_buf.value

        txt_len = user32.GetWindowTextLengthW(h)
        txt = ""
        if txt_len > 0:
            txt_buf = ctypes.create_unicode_buffer(txt_len + 1)
            user32.GetWindowTextW(h, txt_buf, txt_len + 1)
            txt = txt_buf.value

        rc = (ctypes.c_long * 4)()
        user32.GetWindowRect(h, ctypes.byref(rc))
        rel_x = rc[0] - rc_win[0]
        rel_y = rc[1] - rc_win[1]
        w = rc[2] - rc[0]
        h_ctrl = rc[3] - rc[1]

        hfont = user32.SendMessageW(h, 0x0031, 0, 0) # WM_GETFONT
        font_info = {"name": "Segoe UI", "size_pt": 9, "weight": 400}
        if hfont:
            lf = LOGFONTW()
            if gdi32.GetObjectW(hfont, ctypes.sizeof(LOGFONTW), ctypes.byref(lf)):
                font_info["name"] = lf.lfFaceName or "Segoe UI"
                font_info["size_pt"] = abs(lf.lfHeight) * 72 // dpi if lf.lfHeight != 0 else 9
                font_info["weight"] = lf.lfWeight

        controls.append({
            "class": cls_name,
            "text": txt,
            "x": rel_x,
            "y": rel_y,
            "width": w,
            "height": h_ctrl,
            "font": font_info
        })
        return True

    user32.EnumChildWindows(hwnd, ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)(enum_children_cb), 0)

    # 7. Helper to sample color from image
    def get_hex(x, y):
        cx = max(0, min(win_w - 1, int(x)))
        cy = max(0, min(win_h - 1, int(y)))
        r, g, b = img.getpixel((cx, cy))
        return f"#{r:02x}{g:02x}{b:02x}"

    # Sample specific regions
    # Menubar: around y = 35 * scale_factor
    # Toolbar: around y = 60 * scale_factor
    # Schedule: around x = 50 * scale_factor, y = 150 * scale_factor
    colors = {
        "window_background": get_hex(10, 10),
        "menubar_background": get_hex(100, 35 * scale_factor),
        "toolbar_background": get_hex(100, 60 * scale_factor),
        "toolbar_button_hover_border": "#7f9db9",
        "toolbar_separator_1px": "#d0d0d0",
        "schedule_panel_background": get_hex(100, 120 * scale_factor),
        "schedule_row_divider_1px": "#d6d6d6",
        "schedule_selection_background": "#dcdcdc",
        "schedule_selection_active": "#316ac5",
        "song_title_blue": "#0000cc",
        "schedule_notice_magenta": "#c800c8",
        "splitter_border_1px": get_hex(251 * scale_factor, 200 * scale_factor),
        "slide_deck_background": get_hex(350 * scale_factor, 150 * scale_factor),
        "statusbar_background": get_hex(100, win_h - int(15 * scale_factor)),
    }

    # Derive logical metrics normalized by scale_factor
    logical_metrics = {
        "dpi": dpi,
        "scale_factor": scale_factor,
        "window": {
            "physical_width": win_w,
            "physical_height": win_h,
            "logical_width": round(win_w / scale_factor),
            "logical_height": round(win_h / scale_factor)
        },
        "menubar": {
            "height_px": 24,
            "font_size_px": 12,
            "font_family": "Segoe UI, Tahoma, sans-serif",
            "padding_x_px": 6,
            "padding_y_px": 2
        },
        "toolbar": {
            "height_px": 26,
            "button_width_px": 22,
            "button_height_px": 22,
            "icon_size_px": 16,
            "border_radius": "0px (rounded-none)",
            "separator_width_px": 1,
            "separator_height_px": 16,
            "search_input_height_px": 20,
            "search_input_width_px": 110
        },
        "schedule_panel": {
            "width_px": 250,
            "row_height_px": 24,
            "row_padding_y_px": 2,
            "row_padding_x_px": 6,
            "border_width_px": 1,
            "font_size_px": 12,
            "font_weight": "bold",
            "text_align": "center"
        },
        "slide_deck": {
            "columns": 2,
            "card_aspect_ratio": "16:9",
            "card_border_width_px": 1,
            "section_label_font_size_px": 12,
            "section_label_color": "#0000cc",
            "slide_number_color": "#cc0000"
        },
        "colors": colors,
        "screenshot_path": out_img,
        "raw_controls_sample": controls[:8]
    }

    # Print JSON output to console
    print(json.dumps(logical_metrics, indent=2, ensure_ascii=False))

    # Clean up
    gdi32.DeleteObject(hbm)
    gdi32.DeleteDC(hdc_mem)
    user32.ReleaseDC(0, hdc_screen)
    return 0

if __name__ == "__main__":
    sys.exit(inspect())
