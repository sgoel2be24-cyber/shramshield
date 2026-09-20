#!/usr/bin/env python3
"""Build the HACKDAY 1.0 deck for ShramShield (6 skimmable slides, 16:9).

Numbers on the slides are the ones asserted in src/lib/scenario-report.test.ts and measured by
node scripts/collect_evidence.mjs. If those change, change this file in the same commit.
"""
from __future__ import annotations

import pathlib

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt

BG = RGBColor(0x0A, 0x0F, 0x14)
PANEL = RGBColor(0x17, 0x20, 0x2B)
INK = RGBColor(0xE9, 0xEF, 0xF5)
MUTED = RGBColor(0x90, 0xA2, 0xB4)
ACCENT = RGBColor(0xF2, 0xB1, 0x3C)
DANGER = RGBColor(0xFF, 0xC9, 0xD2)
GOOD = RGBColor(0x7F, 0xD6, 0xAC)

OUT = pathlib.Path(__file__).resolve().parents[1] / "deck" / "ShramShield-HACKDAY-1.0.pptx"


def slide(prs: Presentation):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG
    bg.line.fill.background()
    bg.shadow.inherit = False
    return s


def card(s, x, y, w, h):
    box = s.shapes.add_shape(1, Inches(x), Inches(y), Inches(w), Inches(h))
    box.fill.solid()
    box.fill.fore_color.rgb = PANEL
    box.line.color.rgb = RGBColor(0x22, 0x30, 0x3F)
    box.shadow.inherit = False
    return box


def text(s, x, y, w, h, runs, size=16, color=INK, bold=False, align=PP_ALIGN.LEFT, space=6):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, line in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(space)
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
        r.font.name = "Helvetica Neue"
    return tb


def kicker(s, label):
    text(s, 0.7, 0.45, 12, 0.4, [label.upper()], size=11, color=ACCENT, bold=True)


def headline(s, line):
    text(s, 0.7, 0.9, 12.2, 1.1, [line], size=30, bold=True)


def table(s, x, y, w, rows, col_widths, header=True):
    shape = s.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(0.4 * len(rows)))
    tbl = shape.table
    for i, width in enumerate(col_widths):
        tbl.columns[i].width = Emu(int(Inches(w) * width))
    for r, row in enumerate(rows):
        tbl.rows[r].height = Inches(0.38)
        for c, value in enumerate(row):
            cell = tbl.cell(r, c)
            cell.text = value
            cell.fill.solid()
            cell.fill.fore_color.rgb = PANEL
            para = cell.text_frame.paragraphs[0]
            para.runs[0].font.size = Pt(14 if not (header and r == 0) else 12)
            para.runs[0].font.bold = header and r == 0
            para.runs[0].font.color.rgb = MUTED if (header and r == 0) else INK
            para.runs[0].font.name = "Helvetica Neue"
    return tbl


def build() -> pathlib.Path:
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.33), Inches(7.5)

    # 1 — hook
    s = slide(prs)
    kicker(s, "HACKDAY 1.0 · Tech for a Better Tomorrow")
    text(s, 0.7, 1.1, 12.2, 2.0, ["India's heat alerts measure temperature.", "Workers collapse on humidity."], size=38, bold=True)
    text(s, 0.7, 3.3, 11, 1.4, [
        "ShramShield turns a weather forecast into an enforceable heat-safety shift plan for people who work outdoors:",
        "when to start, how many minutes to work and rest each hour, how much water, and which hours must stop.",
    ], size=17, color=MUTED)
    text(s, 0.7, 5.3, 11, 0.8, ["shramshield.vercel.app  ·  github.com/sgoel2be24-cyber/shramshield"], size=16, color=ACCENT, bold=True)
    text(s, 0.7, 6.1, 11, 0.6, ["Solo entry · built in the 8-hour HACKDAY window, 20 September 2026"], size=12, color=MUTED)

    # 2 — problem
    s = slide(prs)
    kicker(s, "The problem")
    headline(s, "Deaths are documented on days when no alert was issued")
    text(s, 0.7, 2.0, 6.4, 3.6, [
        "At least 84 heatstroke deaths, February–July 2025 in a news-based analysis; 7,192 suspected cases against only 14 confirmed (NCDC, via RTI).",
        "Most victims: elderly people, outdoor workers, daily-wage labourers — over 90% of India's workforce is informal, with no mandatory breaks or shade.",
        "HeatWatch's 2025 report recommends WBGT-based alerts and enforceable work-rest cycles; IMD's warnings remain dry-bulb only. A plea is pending before the Supreme Court.",
    ], size=15, color=INK)
    card(s, 7.4, 2.0, 5.3, 3.6)
    text(s, 7.8, 2.3, 4.6, 3.0, [
        "WBGT = 0.7·Tnwb + 0.2·Tg + 0.1·Tdb",
        "",
        "Temperature alone cannot express this. A supervisor does not need another readout — they need to know what to do with today's shift.",
    ], size=15, color=INK)
    text(s, 0.7, 6.1, 12, 0.6, ["Sources: HeatWatch “Struck by Heat” (2025); The Hindu; LiveLaw (SC plea, July 2026)"], size=11, color=MUTED)

    # 3 — what it does
    s = slide(prs)
    kicker(s, "What it does")
    headline(s, "One screen: the plan for today's shift")
    table(s, 0.7, 2.0, 11.9, [
        ["Output", "Example — Delhi forecast, moderate work, acclimatised crew"],
        ["Recommended shift window", "05:00 – 13:00 instead of the default 09:00 rota"],
        ["Minutes above the limit (8 h window)", "60 min at 05:00 vs 240 min on the 09:00 rota"],
        ["Work / rest per hour", "53 min work / 7 min rest early → 8 min work / 52 min rest at noon"],
        ["Water for the crew", "litres per worker for that window"],
        ["Stop-work hours", "11:00–14:00 across the day, very heavy work, real May 2025 Delhi day"],
        ["Hand-off", "Copy plan as text (WhatsApp-ready) · print as a one-page wall sheet"],
    ], [0.30, 0.70])
    text(s, 0.7, 5.4, 12, 1.0, [
        "Live forecast, or real bundled data for seven Indian cities and two archived heatwave days —",
        "the demo works with no network and no API key at all.",
    ], size=15, color=MUTED)

    # 4 — proof
    s = slide(prs)
    kicker(s, "Proof")
    headline(s, "Same thermometer. Different danger.")
    table(s, 0.7, 2.0, 11.9, [
        ["Real day, 20 May 2025", "Peak air temp", "Peak WBGT", "Work permitted (moderate)", "Work permitted (very heavy)"],
        ["Delhi", "42.6 °C", "30.9 °C", "897 min", "310 min, 240 min stopped"],
        ["Jaisalmer", "42.5 °C", "28.8 °C", "1,167 min", "447 min, no stop hours"],
    ], [0.24, 0.16, 0.15, 0.23, 0.30])
    text(s, 0.7, 4.15, 12, 1.25, [
        "Air temperatures within 0.1 °C. Delhi's humidity costs the same crew 270 minutes of permitted work and",
        "pushes very heavy work into a genuine stop-work state. No dry-bulb alert can see that.",
    ], size=17, color=INK)
    card(s, 0.7, 5.5, 5.7, 1.45)
    text(s, 1.0, 5.68, 5.2, 1.15, ["76/76 engine tests pass", "tsc clean · strict + noUncheckedIndexedAccess"], size=14, color=GOOD, bold=True)
    card(s, 6.9, 5.5, 5.7, 1.45)
    text(s, 7.2, 5.68, 5.2, 1.15, [
        "Wet bulb matches Open-Meteo's independent implementation",
        "0.051 °C mean / 0.170 °C worst case over 504 real hours",
    ], size=13, color=GOOD, bold=True)

    # 5 — not a calculator
    s = slide(prs)
    kicker(s, "Why this is not a calculator")
    headline(s, "No instrument. No key. Our own search over the day.")
    text(s, 0.7, 2.0, 6.0, 3.6, [
        "Existing tools need a WBGT meter or manual site readings, or are paid hardware platforms.",
        "ShramShield computes WBGT from a free keyless forecast, then searches candidate start times and ranks them by minutes above the safe limit — answering “when should this crew work?”.",
        "The engine is hand-written and framework-free: WBGT maths, the ACGIH/ISO tables recorded verbatim, the optimiser, with tests that pin table values, physical properties and the demo narrative.",
    ], size=15)
    card(s, 7.0, 2.0, 5.7, 1.7)
    text(s, 7.3, 2.2, 5.1, 1.4, ["Auditable by design", "Every limit traces to a published table, and the app states what is estimated and what is not proven."], size=14, color=INK)
    card(s, 7.0, 3.9, 5.7, 1.7)
    text(s, 7.3, 4.1, 5.1, 1.4, ["Degrades honestly", "Live forecast fails → bundled real data, with a visible reason. Never a blank screen or a fake number."], size=14, color=INK)
    card(s, 7.0, 5.8, 5.7, 1.3)
    text(s, 7.3, 5.95, 5.1, 1.0, [
        "Cheap to run, measured",
        "95 KB in 3 requests, no server, no key, zero API calls unless a live forecast is asked for.",
    ], size=14, color=INK)

    # 6 — try it
    s = slide(prs)
    kicker(s, "Try it")
    headline(s, "Open the link, switch two controls")
    text(s, 0.7, 2.0, 12, 2.2, [
        "1.  The default view: the verdict line — start 05:00, not 09:00.",
        "2.  Dataset → Delhi heatwave (May 2025) and Work rate → Very heavy work: the banner names the stop hours inside the shift, the timeline four across the day — a real 2025 day.",
        "3.  “Same thermometer, different danger” — the two-city comparison.",
        "4.  “How this is computed, and what we have not proven” — standards, assumptions, measured evidence.",
    ], size=16)
    text(s, 0.7, 4.6, 12, 1.4, [
        "shramshield.vercel.app   ·   github.com/sgoel2be24-cyber/shramshield",
        "Advisory tool. Modelled globe and wet-bulb terms, no clothing adjustment, night shift out of scope — stated in the app.",
    ], size=15, color=ACCENT, bold=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT)
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"wrote {path} ({path.stat().st_size} bytes)")
