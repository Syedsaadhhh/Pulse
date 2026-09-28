"""Render the single-page Rocketathon Fabless datasheet."""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "PulseTrust-datasheet.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = Path("C:/Windows/Fonts/arial.ttf")
BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
pdfmetrics.registerFont(TTFont("ArialLocal", str(FONT)))
pdfmetrics.registerFont(TTFont("ArialLocalBold", str(BOLD)))

W, H = A4
C = canvas.Canvas(str(OUT), pagesize=A4)
C.setTitle("PulseTrust - one-page Fabless datasheet")
navy = colors.HexColor("#071824")
teal = colors.HexColor("#087D83")
light = colors.HexColor("#E8F5F4")
muted = colors.HexColor("#46636B")
line = colors.HexColor("#CEE1E1")
body = ParagraphStyle("body", fontName="ArialLocal", fontSize=8.8, leading=12.2,
                      textColor=navy, alignment=TA_LEFT)
small = ParagraphStyle("small", parent=body, fontSize=7.9, leading=10.4)

def para(text, x, top, width, style=body):
    p = Paragraph(text, style)
    _, height = p.wrap(width, 900)
    p.drawOn(C, x, top-height)
    return top-height

def heading(text, x, y):
    C.setFillColor(teal)
    C.setFont("ArialLocalBold", 10)
    C.drawString(x, y, text.upper())
    return y-10

def rule(y):
    C.setStrokeColor(line)
    C.line(42, y, W-42, y)

C.setFillColor(navy)
C.rect(0, H-101, W, 101, stroke=0, fill=1)
C.setFillColor(colors.HexColor("#64E0D8"))
C.setFont("ArialLocalBold", 26)
C.drawString(42, H-55, "PulseTrust")
C.setFillColor(colors.white)
C.setFont("ArialLocal", 10)
C.drawString(43, H-78, "A digital pulse integrity block for sensor designers")
C.setFont("ArialLocalBold", 8)
C.drawRightString(W-42, H-39, "PAK TROOPERS  |  ROCKETATHON FABLESS")
C.drawRightString(W-42, H-78, "28 SEP 2026  |  PRE-EVENT PROTOTYPE")

y = H-121
C.setFillColor(light)
C.roundRect(42, y-75, W-84, 75, 8, stroke=0, fill=1)
C.setFillColor(teal)
C.setFont("ArialLocalBold", 9)
C.drawString(55, y-18, "THE PROBLEM")
para("Noise and switch bounce can make a pulse-output sensor report events that never happened. "
     "A low event count during an expected operating window can also signal a process fault. "
     "PulseTrust gives an integrator a compact, auditable digital front end.", 55, y-25, W-110, body)
y -= 96

y = heading("What the circuit does", 42, y)
y = para("<b>Synchronize</b> a conditioned logic-level input with two flip-flops; "
         "<b>filter</b> transitions until 1-8 stable clock samples arrive; "
         "<b>count</b> accepted rising edges up to 255; then "
         "<b>snapshot</b> each host-defined measurement window with glitch, low-count, "
         "overflow and ready flags.", 42, y-6, W-84)
y -= 22

y = heading("Pin contract", 42, y)
table = [
    ("ui[0]", "Raw conditioned digital pulse input"),
    ("ui[3:1]", "Stable samples minus one: 0-7 means 1-8 samples"),
    ("ui[4], [5], [6]", "Enable, synchronous clear, window boundary"),
    ("ui[7]", "Read live count or last completed count"),
    ("uio_in[7:0]", "Minimum expected pulses in the closing window"),
    ("uo_out[7:0]", "Selected saturating 8-bit count"),
    ("uio_out[0:6]", "Filtered level, accepted strobe, glitch, low-count, overflow, ready, enable"),
]
row_h = 19
top = y-7
C.setFillColor(navy)
C.roundRect(42, top-row_h, W-84, row_h, 3, stroke=0, fill=1)
C.setFillColor(colors.white)
C.setFont("ArialLocalBold", 8)
C.drawString(52, top-13, "SIGNAL")
C.drawString(160, top-13, "FUNCTION")
for i, (pin, meaning) in enumerate(table):
    yy = top-row_h*(i+2)
    if i % 2 == 0:
        C.setFillColor(colors.HexColor("#F1F7F7"))
        C.rect(42, yy, W-84, row_h, stroke=0, fill=1)
    C.setFillColor(navy)
    C.setFont("ArialLocalBold", 8)
    C.drawString(52, yy+6, pin)
    C.setFont("ArialLocal", 7.8)
    C.drawString(160, yy+6, meaning)
y = top-row_h*(len(table)+1)-22

y = heading("Live proof", 42, y)
y = para("A seeded synthetic input with <b>5 intended events and 8 short spikes</b> produced "
         "13 raw edges. The actual Verilog simulation accepted 5 and rejected 8. "
         "A self-checking Icarus test passes noise rejection, valid counting, window snapshots, "
         "low-count alerts and overflow. Yosys synthesis reports 156 generic cells with no structural errors; "
         "these are not mapped area or timing results.", 42, y-6, W-84)
y -= 20

y = heading("Engineering limits", 42, y)
y = para("A filter can reject narrow valid pulses; the fastest setting can accept noise. "
         "The count saturates at 255. Synchronization reduces, but cannot eliminate, metastability risk. "
         "This block needs an external analog/protection stage, clock, power and host control. "
         "No physical silicon or certified measurement is claimed. <b>1x1 tile fit and 50 MHz "
         "remain targets until a LibreLane layout and timing report passes.</b>", 42, y-6, W-84)

y -= 32
C.setFillColor(teal)
C.setFont("ArialLocalBold", 8)
C.drawString(42, y, "SIGNAL PATH")
labels = [("01", "Synchronize"), ("02", "Filter"), ("03", "Count"), ("04", "Audit")]
gap = 12
box_w = (W-84-gap*3)/4
for index, (number, label) in enumerate(labels):
    x = 42 + index*(box_w+gap)
    C.setFillColor(light)
    C.roundRect(x, y-53, box_w, 42, 6, stroke=0, fill=1)
    C.setFillColor(teal)
    C.setFont("ArialLocalBold", 7)
    C.drawString(x+10, y-26, number)
    C.setFillColor(navy)
    C.setFont("ArialLocalBold", 9)
    C.drawString(x+10, y-42, label)

rule(75)
C.setFillColor(muted)
C.setFont("ArialLocal", 7.4)
C.drawString(42, 61, "Source: original src/project.v | Reproduce: run-tests.ps1 and run-demo.ps1")
C.drawString(42, 49, "Problem evidence: Rockwell 1746-UM002B-EN-P; prior art: Espressif PCNT documentation")
C.setFont("ArialLocalBold", 7.4)
C.drawRightString(W-42, 49, "1 / 1")
if y < 84:
    raise RuntimeError(f"Datasheet content exceeds one page: final y={y:.1f}")
C.showPage()
C.save()
print(OUT)
