"""
Logicon Field Operations – Professional PDF Report
PowerBI/Tableau inspired clean white design.
Matches frontend: white bg, subtle borders, blue accent only.
"""

import io, json, os, datetime

from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable
)
from reportlab.platypus.flowables import KeepTogether
from reportlab.lib.units import mm, inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# ─────────────────────── PALETTE ─────────────────────────────
# Exactly from frontend index.css — clean, minimal
BLUE        = colors.HexColor("#3B82F6")   # primary accent
BLUE_LIGHT  = colors.HexColor("#EFF6FF")   # light blue bg
BLUE_MID    = colors.HexColor("#DBEAFE")   # border/divider
INDIGO      = colors.HexColor("#6366F1")   # secondary accent
GREEN       = colors.HexColor("#22C55E")   # success / completed
AMBER       = colors.HexColor("#F59E0B")   # warning / missed
RED         = colors.HexColor("#EF4444")   # danger / critical

WHITE       = colors.white
BG_PAGE     = colors.HexColor("#F8FAFC")   # very light grey page bg
BG_CARD     = colors.white
BG_ROW_A    = colors.white
BG_ROW_B    = colors.HexColor("#F8FAFC")   # alt row
BG_HEADER   = colors.HexColor("#F1F5F9")   # table header bg
BORDER      = colors.HexColor("#E2E8F0")   # light card border
BORDER_MED  = colors.HexColor("#CBD5E1")   # medium border
CYAN        = colors.HexColor("#0F172A")   # Now Logicon Dark Navy for Header

TXT_1       = colors.HexColor("#0F172A")   # primary text
TXT_2       = colors.HexColor("#334155")   # secondary text
TXT_3       = colors.HexColor("#64748B")   # muted text
TXT_4       = colors.HexColor("#94A3B8")   # very muted

# ─────────────────────── PAGE ─────────────────────────────────
PW, PH   = landscape(A4)
LM = RM  = 20 * mm
TM       = 18 * mm
BM       = 18 * mm
CW       = PW - LM - RM
LOGO     = r"C:\field-senses-app-main\frontend\dist\logicon-logo.png"


# ─────────────────────── TYPOGRAPHY ──────────────────────────
def S():
    def ps(name, **kw):
        return ParagraphStyle(name, **kw)
    return {
        # Cover
        'cov_co':   ps('cc', fontName='Helvetica-Bold', fontSize=9,  textColor=TXT_3,  alignment=TA_CENTER, spaceAfter=2),
        'cov_ttl':  ps('ct', fontName='Helvetica-Bold', fontSize=30, textColor=TXT_1,  alignment=TA_CENTER, leading=38),
        'cov_sub':  ps('cs', fontName='Helvetica',      fontSize=12, textColor=TXT_2,  alignment=TA_CENTER, leading=20),
        'cov_dt':   ps('cd', fontName='Helvetica',      fontSize=9,  textColor=TXT_3,  alignment=TA_CENTER),

        # Page header
        'pg_title': ps('pt', fontName='Helvetica-Bold', fontSize=14, textColor=TXT_1,  spaceAfter=2),
        'pg_sub':   ps('ps', fontName='Helvetica',      fontSize=8,  textColor=TXT_3,  spaceAfter=8),

        # KPI
        'kpi_v':    ps('kv', fontName='Helvetica-Bold', fontSize=18, textColor=BLUE,   alignment=TA_CENTER),
        'kpi_vg':   ps('kg', fontName='Helvetica-Bold', fontSize=18, textColor=GREEN,  alignment=TA_CENTER),
        'kpi_va':   ps('ka', fontName='Helvetica-Bold', fontSize=18, textColor=AMBER,  alignment=TA_CENTER),
        'kpi_vr':   ps('kr', fontName='Helvetica-Bold', fontSize=18, textColor=RED,    alignment=TA_CENTER),
        'kpi_l':    ps('kl', fontName='Helvetica',      fontSize=7.5,textColor=TXT_3,  alignment=TA_CENTER, leading=10),

        # Table
        'th':       ps('th', fontName='Helvetica-Bold', fontSize=8,  textColor=TXT_2,  alignment=TA_CENTER),
        'th_l':     ps('tl', fontName='Helvetica-Bold', fontSize=8,  textColor=TXT_2,  alignment=TA_LEFT),
        'td':       ps('td', fontName='Helvetica',      fontSize=8.5,textColor=TXT_1,  leading=12),
        'td_c':     ps('tc', fontName='Helvetica',      fontSize=8.5,textColor=TXT_1,  alignment=TA_CENTER, leading=12),
        'td_g':     ps('tg', fontName='Helvetica-Bold', fontSize=8.5,textColor=GREEN,  alignment=TA_CENTER),
        'td_a':     ps('ta', fontName='Helvetica-Bold', fontSize=8.5,textColor=AMBER,  alignment=TA_CENTER),
        'td_r':     ps('tr', fontName='Helvetica-Bold', fontSize=8.5,textColor=RED,    alignment=TA_CENTER),
        'td_lnk':   ps('tn', fontName='Helvetica',      fontSize=8.5,textColor=BLUE),

        # Employee
        'emp_n':    ps('en', fontName='Helvetica-Bold', fontSize=13, textColor=TXT_1),
        'emp_sl':   ps('el', fontName='Helvetica',      fontSize=7,  textColor=TXT_3,  alignment=TA_CENTER),
        'emp_sv':   ps('ev', fontName='Helvetica-Bold', fontSize=18, textColor=TXT_1,  alignment=TA_CENTER),
        'emp_sg':   ps('eg', fontName='Helvetica-Bold', fontSize=18, textColor=GREEN,  alignment=TA_CENTER),
        'emp_sa':   ps('ea', fontName='Helvetica-Bold', fontSize=18, textColor=AMBER,  alignment=TA_CENTER),

        # Date / Activity
        'dt_l':     ps('dl', fontName='Helvetica-Bold', fontSize=8.5,textColor=BLUE),
        'act_tp':   ps('at', fontName='Helvetica-Bold', fontSize=6.5,textColor=TXT_4,  leading=9),
        'act_nm':   ps('an', fontName='Helvetica-Bold', fontSize=10, textColor=TXT_1,  leading=14, spaceAfter=1),
        'act_mt':   ps('am', fontName='Helvetica',      fontSize=7.5,textColor=TXT_3,  leading=11),

        # Body / footer
        'body':     ps('bd', fontName='Helvetica',      fontSize=8.5,textColor=TXT_2,  leading=13),
        'foot':     ps('ft', fontName='Helvetica',      fontSize=7,  textColor=TXT_4),
    }


# ─────────────────────── PAGE HEADER & FOOTER ────────────────────────
def page_cb(period_str):
    def draw(canvas, doc):
        canvas.saveState()
        
        # ── FULL WIDTH NAVY HEADER BAND ──
        header_h = 1.0 * inch
        canvas.setFillColor(colors.HexColor("#0F172A"))
        canvas.rect(0, PH - header_h, PW, header_h, fill=1, stroke=0)
        
        # ── Header Logo (Left) ──
        if os.path.exists(LOGO):
            logo_w = 1.2 * inch # Slightly smaller so it fits
            logo_h = 0.4 * inch
            canvas.drawImage(
                LOGO, 
                LM + 10, # Add a little padding from the left edge
                PH - header_h / 2 - logo_h / 2, 
                width=logo_w, height=logo_h, 
                preserveAspectRatio=True, mask='auto'
            )
        
        # ── Header Text (Right) ──
        canvas.setFont("Helvetica", 14)
        canvas.setFillColor(WHITE)
        canvas.drawRightString(PW - RM - 10, PH - header_h / 2 + 5, "Performance Report")
        
        canvas.setFont("Helvetica", 10)
        canvas.setFillColor(WHITE)
        canvas.drawRightString(PW - RM - 10, PH - header_h / 2 - 10, period_str)

        # ── Footer ──
        y = BM - 9 * mm
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(LM, y, PW - RM, y)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(TXT_4)
        canvas.drawString(LM, y - 4*mm, "Logicon Field Operations")
        canvas.drawRightString(PW - RM, y - 4*mm, f"Page {doc.page}")
            
        canvas.restoreState()
    return draw


# ─────────────────────── PAGE HEADER (inline) ────────────────
def page_header(title, subtitle, st):
    return [
        Paragraph(title, st['pg_title']),
        Paragraph(subtitle, st['pg_sub']),
        HRFlowable(width=CW, thickness=1.5, color=BLUE, spaceBefore=0, spaceAfter=10),
    ]


# ─────────────────────── KPI TABLE (flat 2-row) ──────────────
def kpi_table(items, st):
    """
    Proper flat 2-row table. Row 0 = values. Row 1 = labels.
    NO nested tables. This is the only reliable way in ReportLab.
    """
    n   = len(items)
    cw  = CW / n

    val_row = [Paragraph(str(v), st[sk]) for v, l, sk in items]
    lbl_row = [Paragraph(l,      st['kpi_l']) for v, l, sk in items]

    t = Table([val_row, lbl_row], colWidths=[cw] * n)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), WHITE),
        ('LINEABOVE',     (0, 0), (-1,  0), 2.5,  BLUE),
        ('BOX',           (0, 0), (-1, -1), 0.5,  BORDER),
        ('LINEBEFORE',    (1, 0), (-1, -1), 0.5,  BORDER),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1,  0), 14),
        ('BOTTOMPADDING', (0, 0), (-1,  0), 4),
        ('TOPPADDING',    (0, 1), (-1,  1), 2),
        ('BOTTOMPADDING', (0, 1), (-1,  1), 12),
    ]))
    return t


# ─────────────────────── TEAM TABLE ──────────────────────────
PASS_W = {'yes','good','issued & displayed','submitted','properly dressed',
           'complete','available','maintained','ok','done'}
FAIL_W = {'no','shortage','requires repair','not maintained','not issued',
           'incomplete','pending','pending entries','partial','overdue'}

def ans_style(answer, st):
    a = answer.strip().lower()
    if a in PASS_W:                  return st['td_g']
    if any(f in a for f in FAIL_W): return st['td_a']
    return st['td_c']


def team_table(emp_list, st):
    heads = ["#","Employee","Meetings","Completed","Missed",
             "Distance","Fuel Cost","MOMs","Visits"]
    cw    = [22, 148, 62, 82, 60, 68, 82, 48, 48]

    rows = [[Paragraph(h, st['th_l'] if i==1 else st['th'])
             for i, h in enumerate(heads)]]

    for i, e in enumerate(emp_list, 1):
        tot  = e['meetings']
        comp = e['completed']
        miss = e['missed']
        pct  = int(comp/tot*100) if tot else 0
        cs   = 'td_g' if pct >= 80 else ('td_a' if pct >= 50 else 'td_r')
        ms   = 'td_c' if miss == 0 else ('td_a' if miss <= 2 else 'td_r')

        rows.append([
            Paragraph(str(i),              st['td_c']),
            Paragraph(e['name'],           st['td']),
            Paragraph(str(tot),            st['td_c']),
            Paragraph(f"{comp} ({pct}%)",  st[cs]),
            Paragraph(str(miss),           st[ms]),
            Paragraph(f"{e['distance']} km", st['td_c']),
            Paragraph(f"Rs. {e['fuel_cost']}", st['td_c']),
            Paragraph(str(e['moms']),      st['td_c']),
            Paragraph(str(e['visits']),    st['td_c']),
        ])

    bgs = [('BACKGROUND', (0, r), (-1, r),
            BG_ROW_A if r % 2 != 0 else BG_ROW_B) for r in range(1, len(rows))]

    t = Table(rows, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  BG_HEADER),
        ('LINEBELOW',     (0, 0), (-1, 0),  1.5, BLUE),
        ('GRID',          (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [BG_ROW_A, BG_ROW_B]),
    ] + bgs))
    return t


# ─────────────────────── EMPLOYEE BANNER ─────────────────────
def emp_banner(name, stat, st):
    tot  = stat.get('meetings',  0)
    comp = stat.get('completed', 0)
    miss = stat.get('missed',    0)
    pct  = int(comp/tot*100) if tot else 0
    cs   = 'emp_sg' if pct >= 80 else 'emp_sa'
    ms   = 'emp_sv' if miss == 0 else 'emp_sa'

    # Light card with blue left border — clean, no dark navy
    w = CW
    t = Table([
        [Paragraph("Employee", st['emp_sl']),
         Paragraph("Total Meetings", st['emp_sl']),
         Paragraph("Completed", st['emp_sl']),
         Paragraph("Missed / Delayed", st['emp_sl'])],
        [Paragraph(name, st['emp_n']),
         Paragraph(str(tot), st['emp_sv']),
         Paragraph(f"{comp} ({pct}%)", st[cs]),
         Paragraph(str(miss), st[ms])],
    ], colWidths=[w*0.40, w*0.20, w*0.20, w*0.20])

    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), BLUE_LIGHT),
        ('LINEABOVE',     (0, 0), (-1,  0), 3, BLUE),
        ('BOX',           (0, 0), (-1, -1), 0.5, BLUE_MID),
        ('LINEBEFORE',    (1, 0), (3, -1),  0.5, BLUE_MID),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',         (1, 0), (-1, -1), 'CENTER'),
    ]))
    return t


# ─────────────────────── ACTIVITY STRIP ──────────────────────
def act_strip(act_type, title, meta, badge_color, st):
    """Thin colored left border + activity header. White background."""
    t = Table(
        [[Paragraph("", st['body']),
          [Paragraph(act_type.upper(), st['act_tp']),
           Paragraph(title,            st['act_nm']),
           Paragraph(meta,             st['act_mt'])]]],
        colWidths=[4, CW - 4]
    )
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (0, -1), badge_color),
        ('BACKGROUND',    (1, 0), (-1,-1), WHITE),
        ('BOX',           (0, 0), (-1,-1), 0.5, BORDER),
        ('TOPPADDING',    (1, 0), (-1,-1), 8),
        ('BOTTOMPADDING', (1, 0), (-1,-1), 8),
        ('LEFTPADDING',   (1, 0), (-1,-1), 10),
        ('RIGHTPADDING',  (1, 0), (-1,-1), 8),
        ('LEFTPADDING',   (0, 0), (0, -1), 0),
        ('RIGHTPADDING',  (0, 0), (0, -1), 0),
        ('TOPPADDING',    (0, 0), (0, -1), 0),
        ('BOTTOMPADDING', (0, 0), (0, -1), 0),
    ]))
    return t


# ─────────────────────── CHECKLIST TABLE ─────────────────────
def flatten(report_data):
    if isinstance(report_data, str):
        try:   report_data = json.loads(report_data)
        except: return {}
    if not isinstance(report_data, dict): return {}
    flat = {}
    for k, v in report_data.items():
        if isinstance(v, str) and v.strip().startswith('{'):
            try:
                nested = json.loads(v)
                if isinstance(nested, dict):
                    flat.update(nested); continue
            except: pass
        flat[k] = v
    if 'data' in flat:
        dv = flat.pop('data')
        try:
            nested = json.loads(dv) if isinstance(dv, str) else dv
            if isinstance(nested, dict): flat.update(nested)
        except: pass
    return flat


def checklist_tbl(report_data, st):
    flat   = flatten(report_data)
    if not flat:
        return Paragraph("No checklist data recorded.", st['body'])

    photos = {k: v for k, v in flat.items() if k.startswith('photo_')}
    fields = {k: v for k, v in flat.items() if not k.startswith('photo_')}

    heads = [Paragraph("Field / Question", st['th_l']),
             Paragraph("Response",         st['th']),
             Paragraph("Comments",         st['th_l']),
             Paragraph("Evidence",         st['th'])]
    cw = [CW*0.27, CW*0.16, CW*0.38, CW*0.19]
    rows = [heads]

    for k, v in fields.items():
        label   = k.replace('_', ' ').title()
        answer  = str(v.get('answer',  '—') if isinstance(v, dict) else (v or '—'))
        comment = str(v.get('comment', '—') if isinstance(v, dict) else '—')
        photo_url = photos.get(f"photo_{k}", "")
        evidence = (Paragraph(f'<a href="{photo_url}" color="#3B82F6">View Photo</a>', st['td_lnk'])
                    if photo_url else Paragraph("—", st['td_c']))
        rows.append([
            Paragraph(label,   st['td']),
            Paragraph(answer,  ans_style(answer, st)),
            Paragraph(comment, st['td']),
            evidence,
        ])

    bgs = [('BACKGROUND', (0, r), (-1, r),
            BG_ROW_A if r % 2 != 0 else BG_ROW_B) for r in range(1, len(rows))]

    t = Table(rows, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  BG_HEADER),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  TXT_2),
        ('LINEBELOW',     (0, 0), (-1, 0),  1.5, BLUE),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [BG_ROW_A, BG_ROW_B]),
        ('GRID',          (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 7),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 7),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('ALIGN',         (1, 1), (1, -1),  'CENTER'),
        ('ALIGN',         (3, 1), (3, -1),  'CENTER'),
    ] + bgs))
    return t


# ─────────────────────── DASHBOARD CARD ──────────────────────
def dashboard_card(title, value, label, value_color, st):
    """SaaS style dashboard card."""
    # Header row
    h_style = ParagraphStyle('ch', fontName='Helvetica-Bold', fontSize=7, textColor=TXT_3, alignment=TA_LEFT)
    # Body
    v_style = ParagraphStyle('cv', fontName='Helvetica', fontSize=24, leading=28, textColor=value_color, alignment=TA_CENTER, spaceAfter=4)
    l_style = ParagraphStyle('cl', fontName='Helvetica', fontSize=8, textColor=TXT_2, alignment=TA_CENTER)
    
    # We will build a 2-row table.
    # Row 0: Header (Title left, icon right)
    # Row 1: Body (Value and label)
    
    header = Table([[Paragraph(title.upper(), h_style), Paragraph("■", ParagraphStyle('ca', fontName='Helvetica', fontSize=8, textColor=BLUE, alignment=TA_RIGHT))]], colWidths=[None, 20])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_HEADER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (0,0), 10),
        ('RIGHTPADDING', (1,0), (1,0), 10),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    
    body = [
        Spacer(1, 15),
        Paragraph(str(value), v_style),
        Paragraph(label, l_style),
        Spacer(1, 15)
    ]
    
    card = Table([[header], [body]], colWidths=[CW * 0.32]) # For 3 columns
    card.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, BORDER),
        ('BACKGROUND', (0,1), (-1,-1), WHITE),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    
    return card

# ─────────────────────── DASHBOARD CHART CARD ──────────────────
def dashboard_chart_card(title, chart_image, st):
    """SaaS style dashboard card for charts."""
    h_style = ParagraphStyle('ch', fontName='Helvetica-Bold', fontSize=7, textColor=TXT_3, alignment=TA_LEFT)
    
    header = Table([[Paragraph(title.upper(), h_style), Paragraph("■", ParagraphStyle('ca', fontName='Helvetica', fontSize=8, textColor=BLUE, alignment=TA_RIGHT))]], colWidths=[None, 20])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_HEADER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (0,0), 10),
        ('RIGHTPADDING', (1,0), (1,0), 10),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    
    body = [Spacer(1, 5), chart_image, Spacer(1, 5)] if chart_image else [Spacer(1, 15), Paragraph("No Data Available", st['body']), Spacer(1, 15)]
    
    card = Table([[header], [body]], colWidths=[CW * 0.49]) # For 2 columns
    card.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, BORDER),
        ('BACKGROUND', (0,1), (-1,-1), WHITE),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('ALIGN', (0,1), (-1,-1), 'CENTER'),
    ]))
    
    return card

# ─────────────────────── MAIN BUILDER ────────────────────────
def build_pdf_report(data):
    buffer     = io.BytesIO()
    period_str = f"{data['period']['start']} to {data['period']['end']}"
    st         = S()
    metrics    = data['metrics']
    emp_list   = data.get('employee_stats', [])
    emp_map    = {e['name']: e for e in emp_list}
    timeline   = data.get('timeline', {})
    charts     = data.get('charts', {})

    # Top margin must be larger to accommodate the cyan header
    header_h = 1.0 * inch
    body_tm = header_h + 10

    body_frame = Frame(LM, BM, CW, PH - body_tm - BM,
                       leftPadding=0, rightPadding=0,
                       topPadding=0,  bottomPadding=0)

    doc = BaseDocTemplate(
        buffer, pagesize=landscape(A4),
        leftMargin=LM, rightMargin=RM,
        topMargin=body_tm,  bottomMargin=BM,
        pageTemplates=[
            PageTemplate(id='Normal', frames=[body_frame], onPage=page_cb(period_str)),
        ],
    )

    E = []

    # ── Macro Executive Dashboard Cards ──
    tot_m = metrics['total_meetings']
    comp_m = metrics['completed_meetings']
    comp_rate = (comp_m / tot_m) if tot_m else 0
    pct = f"{(comp_rate * 100):.1f}%"
    
    c1 = dashboard_card("OVERALL COMPLETION", pct, "Completion rate", GREEN if comp_rate >= 0.8 else (AMBER if comp_rate >= 0.5 else RED), st)
    c2 = dashboard_card("TOTAL DISTANCE", f"{int(metrics['distance_km'])} km", "Fleet distance traveled", TXT_2, st)
    c3 = dashboard_card("TOTAL FUEL COST", f"Rs. {int(metrics['fuel_cost'])}", "Estimated budget used", RED if metrics['fuel_cost'] > 5000 else TXT_2, st)

    # Grid of cards (3 columns, 1 row)
    grid1 = Table([[c1, c2, c3]], colWidths=[CW*0.33, CW*0.34, CW*0.33])
    grid1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('ALIGN', (0,0), (-1,-1), 'CENTER')]))
    
    E.append(grid1)
    E.append(Spacer(1, 5))

    # ── Dashboard Charts (Row 1) ──
    img1 = Image(charts['employee_performance_bar'], width=CW*0.48, height=1.8*inch) if 'employee_performance_bar' in charts else None
    img2 = Image(charts['meeting_status_pie'],       width=CW*0.48, height=1.8*inch) if 'meeting_status_pie' in charts else None
    
    ch1 = dashboard_chart_card("EMPLOYEE COMPLETION TREND (%)", img1, st)
    ch2 = dashboard_chart_card("WORKFLOW COMPLIANCE PIPELINE", img2, st)
    
    cg = Table([[ch1, ch2]], colWidths=[CW*0.50, CW*0.50])
    cg.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    E.append(cg)
    E.append(Spacer(1, 5))
    
    # ── Dashboard Charts (Row 2) ──
    img3 = Image(charts['visit_trend_line'], width=CW*0.48, height=1.8*inch) if 'visit_trend_line' in charts else None
    img4 = Image(charts['attendance_trend_line'], width=CW*0.48, height=1.8*inch) if 'attendance_trend_line' in charts else None
    
    if img3 and img4:
        ch3 = dashboard_chart_card("VISIT TREND", img3, st)
        ch4 = dashboard_chart_card("ATTENDANCE TREND", img4, st)
        cg2 = Table([[ch3, ch4]], colWidths=[CW*0.50, CW*0.50])
        cg2.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        E.append(cg2)

    # Hard page break after dashboard so the summary starts clean on page 3
    E.append(PageBreak())

    # ── Page 3: Field Team Summary ──
    E += page_header(
        "Field Team Performance Summary",
        "Green = ≥ 80% completion  ·  Amber = 50–79%  ·  Red = < 50%  ·  Cost in INR (Rs.)", st
    )
    E.append(team_table(emp_list, st) if emp_list else
             Paragraph("No employee data for this period.", st['body']))

    # ── Removed detailed checklist sections ──

    doc.build(E)
    buffer.seek(0)
    return buffer
