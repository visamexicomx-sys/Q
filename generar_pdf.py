from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import Flowable

# ── Colors ──────────────────────────────────────────────────────────────────
DARK      = colors.HexColor("#0D0D0D")
GOLD      = colors.HexColor("#F5C518")
GOLD_LIGHT= colors.HexColor("#FFF3B0")
WHITE     = colors.white
GRAY_DARK = colors.HexColor("#1E1E1E")
GRAY_MID  = colors.HexColor("#2D2D2D")
GRAY_TEXT = colors.HexColor("#CCCCCC")
ACCENT    = colors.HexColor("#FF6B35")
BLUE_ACC  = colors.HexColor("#4A9FFF")
GREEN_ACC = colors.HexColor("#4CAF50")

PAGE_W, PAGE_H = A4

# ── Coloured rule ────────────────────────────────────────────────────────────
class ColorRule(Flowable):
    def __init__(self, color, thickness=2, width=None):
        super().__init__()
        self.color = color
        self.thickness = thickness
        self._width = width or (PAGE_W - 4*cm)
        self.height = thickness + 2

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self._width, 0)

# ── Helpers ──────────────────────────────────────────────────────────────────
def S(n=6):
    return Spacer(1, n)

def HR(color=GOLD, thickness=1):
    return ColorRule(color, thickness)

def build_styles():
    base = getSampleStyleSheet()
    def add(name, **kw):
        base.add(ParagraphStyle(name=name, **kw))

    add("Cover_Title",
        fontName="Helvetica-Bold", fontSize=32, textColor=GOLD,
        alignment=TA_CENTER, spaceAfter=10, leading=38)

    add("Cover_Sub",
        fontName="Helvetica", fontSize=14, textColor=WHITE,
        alignment=TA_CENTER, spaceAfter=6, leading=18)

    add("Cover_Tag",
        fontName="Helvetica-Bold", fontSize=11, textColor=DARK,
        alignment=TA_CENTER, backColor=GOLD, spaceAfter=4,
        borderPad=4, leading=16)

    add("Section_Title",
        fontName="Helvetica-Bold", fontSize=18, textColor=GOLD,
        spaceBefore=14, spaceAfter=6, leading=22)

    add("Sub_Title",
        fontName="Helvetica-Bold", fontSize=13, textColor=ACCENT,
        spaceBefore=10, spaceAfter=4, leading=16)

    add("Sub2_Title",
        fontName="Helvetica-Bold", fontSize=11, textColor=BLUE_ACC,
        spaceBefore=8, spaceAfter=3, leading=14)

    add("Body",
        fontName="Helvetica", fontSize=9.5, textColor=GRAY_TEXT,
        spaceBefore=2, spaceAfter=3, leading=14, alignment=TA_JUSTIFY)

    add("Body_White",
        fontName="Helvetica", fontSize=9.5, textColor=WHITE,
        spaceBefore=2, spaceAfter=3, leading=14)

    add("BulletCustom",
        fontName="Helvetica", fontSize=9.5, textColor=GRAY_TEXT,
        spaceBefore=2, spaceAfter=2, leading=13, leftIndent=14,
        firstLineIndent=-10)

    add("Script",
        fontName="Courier", fontSize=8.5, textColor=GREEN_ACC,
        spaceBefore=1, spaceAfter=1, leading=12,
        leftIndent=10, backColor=GRAY_MID, borderPad=4)

    add("Script_Label",
        fontName="Courier-Bold", fontSize=9, textColor=GOLD,
        spaceBefore=4, spaceAfter=1, leading=12, leftIndent=10)

    add("Table_Head",
        fontName="Helvetica-Bold", fontSize=9, textColor=DARK,
        alignment=TA_CENTER, leading=12)

    add("Table_Cell",
        fontName="Helvetica", fontSize=8.5, textColor=DARK,
        alignment=TA_LEFT, leading=11)

    add("Footer_Text",
        fontName="Helvetica", fontSize=8, textColor=GRAY_TEXT,
        alignment=TA_CENTER)

    add("Highlight",
        fontName="Helvetica-Bold", fontSize=10, textColor=DARK,
        backColor=GOLD, borderPad=5, spaceAfter=4, leading=14)

    return base

def dark_table(data, col_widths, head_bg=GOLD, row_bg=GRAY_MID, alt_bg=GRAY_DARK):
    t = Table(data, colWidths=col_widths)
    style = [
        ("BACKGROUND",   (0,0), (-1,0),  head_bg),
        ("TEXTCOLOR",    (0,0), (-1,0),  DARK),
        ("FONTNAME",     (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,0),  9),
        ("ALIGN",        (0,0), (-1,0),  "CENTER"),
        ("GRID",         (0,0), (-1,-1), 0.4, colors.HexColor("#444444")),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [row_bg, alt_bg]),
        ("TEXTCOLOR",    (0,1), (-1,-1), GRAY_TEXT),
        ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,1), (-1,-1), 8.5),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]
    t.setStyle(TableStyle(style))
    return t

# ── Page background ──────────────────────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # gold side bar
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, 4, PAGE_H, fill=1, stroke=0)
    # page number
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY_TEXT)
    canvas.drawCentredString(PAGE_W/2, 1.2*cm, f"Página {doc.page}")
    canvas.restoreState()

# ── Build ────────────────────────────────────────────────────────────────────
def build():
    out = "/home/user/Q/estrategia_instagram_negocios.pdf"
    doc = SimpleDocTemplate(
        out,
        pagesize=A4,
        leftMargin=2.2*cm, rightMargin=1.8*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="Estrategia Instagram – Negocios/Dinero",
        author="Modo Ingenieria IG"
    )
    st = build_styles()
    story = []

    # ═══════════════════════════════════════════════════════════════
    # PORTADA
    # ═══════════════════════════════════════════════════════════════
    story += [
        S(60),
        Paragraph("MODO INGENIERIA", st["Cover_Title"]),
        S(4),
        HR(GOLD, 3),
        S(8),
        Paragraph("ALCANCE MASIVO CON PERFIL CERO", st["Cover_Sub"]),
        S(16),
        Paragraph("NICHO: NEGOCIOS / DINERO", st["Cover_Tag"]),
        S(6),
        Paragraph("FORMATO: REELS + CARRUSEL", st["Cover_Tag"]),
        S(6),
        Paragraph("OBJETIVO: SEGUIDORES RÁPIDOS", st["Cover_Tag"]),
        S(6),
        Paragraph("ESTILO: EDUCATIVO / PRÁCTICO", st["Cover_Tag"]),
        S(40),
        HR(GOLD, 1),
        S(8),
        Paragraph("Estrategia completa · 7 escenarios virales · Guiones · Plan de publicación", st["Cover_Sub"]),
        S(6),
        Paragraph("2026", st["Footer_Text"]),
        PageBreak(),
    ]

    # ═══════════════════════════════════════════════════════════════
    # ÍNDICE
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("ÍNDICE", st["Section_Title"]))
    story.append(HR())
    story.append(S())

    index_items = [
        ("1", "Lógica del Algoritmo de Instagram"),
        ("2", "Los 10 Guiones Más Virales del Nicho"),
        ("3", "ETAPA 1 — Hooks que Funcionan Sin Contexto"),
        ("4", "ETAPA 2 — Retención por Encima del Promedio"),
        ("5", "ETAPA 3 — Señales que Escalan la Entrega"),
        ("6", "ETAPA 4 — Lenguaje para Desconocidos"),
        ("7", "ETAPA 5 — Secuencia de Ataque (10 contenidos)"),
        ("8", "ESCENARIO 1 — El Empleado que Ganaba Más que su Jefe"),
        ("9", "ESCENARIO 2 — El Negocio que Nadie Quiere"),
        ("10", "ESCENARIO 3 — Por qué Renuncié a $25,000"),
        ("11", "ESCENARIO 4 — La Calculadora que Nadie te Muestra"),
        ("12", "ESCENARIO 5 — El Mapa del Dinero (Carrusel)"),
        ("13", "ESCENARIO 6 — Tienes 3 Opciones con tu Dinero"),
        ("14", "ESCENARIO 7 — El Experimento de los $100 Pesos"),
        ("15", "Plan de Publicación Semanal"),
        ("16", "Reglas de Publicación y Resultado Esperado"),
    ]

    for num, title in index_items:
        story.append(Paragraph(
            f'<font color="#F5C518"><b>{num}.</b></font>  {title}',
            st["Body_White"]
        ))
        story.append(S(3))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SEC 1 — LÓGICA DEL ALGORITMO
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("01 — LÓGICA DEL ALGORITMO DE INSTAGRAM", st["Section_Title"]))
    story.append(HR())
    story.append(S())
    story.append(Paragraph(
        "Instagram distribuye contenido nuevo en 3 fases obligatorias. Un perfil con 0 seguidores "
        "puede saltarse la Fase 1 directamente al Fase 3 si el contenido activa las señales correctas "
        "en las primeras 48 horas.", st["Body"]))
    story.append(S(8))

    algo_data = [
        ["FASE", "ALCANCE", "CONDICIÓN PARA AVANZAR"],
        ["PRUEBA", "300 – 800 personas", "Watch time > 50%, saves > 2%"],
        ["EXPANSIÓN", "5,000 – 50,000", "Engagement rate > promedio del nicho (3-5%)"],
        ["EXPLORAR / VIRAL", "100,000+", "Shares + comentarios + replays sostenidos"],
    ]
    story.append(dark_table(algo_data, [3*cm, 5*cm, 8*cm]))
    story.append(S(10))

    story.append(Paragraph(
        '<font color="#F5C518"><b>Regla de oro:</b></font> El contenido no se distribuye por quién eres. '
        'Se distribuye por cómo reacciona la audiencia en los primeros minutos.',
        st["Body_White"]
    ))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SEC 2 — 10 GUIONES VIRALES (resumen)
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("02 — LOS 10 GUIONES MÁS VIRALES DEL NICHO", st["Section_Title"]))
    story.append(HR())
    story.append(S())
    story.append(Paragraph(
        "Basados en la estructura de contenido que ya superó 1M de vistas en el nicho Negocios/Dinero.",
        st["Body"]
    ))
    story.append(S(8))

    guiones = [
        ["#", "HOOK / CONCEPTO", "SEÑAL PRINCIPAL"],
        ["1", "Cómo ganar $X en X tiempo — promesa tangible", "Guardados"],
        ["2", "El error que comete el 90% de emprendedores", "Comentarios"],
        ["3", "Nadie te enseña esto sobre el dinero", "Shares"],
        ["4", "3 negocios que puedes empezar sin dinero", "Guardados masivos"],
        ["5", "Esto me tomó X años aprender", "Watch time completo"],
        ["6", "Si empezara desde cero, haría esto", "Follows directos"],
        ["7", "Por qué la mayoría nunca sale de pobre (suave)", "Comentarios de debate"],
        ["8", "El método que usan los ricos que nadie te dice", "Guardados + shares"],
        ["9", "Cómo validar un negocio en 24 horas", "Watch time + guardados"],
        ["10", "Copia exacta de cómo construí mis primeros ingresos", "Follows + guardados"],
    ]
    story.append(dark_table(guiones, [1*cm, 10*cm, 5*cm]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SEC 3 — ETAPA 1: HOOKS
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("03 — ETAPA 1: HOOKS QUE FUNCIONAN SIN CONTEXTO", st["Section_Title"]))
    story.append(HR())
    story.append(S())
    story.append(Paragraph(
        "Un hook funciona para 0 seguidores si un completo desconocido se detiene aunque no sepa quién eres.",
        st["Body"]
    ))
    story.append(S(8))

    hook_data = [
        ["FÓRMULA", "EJEMPLO", "POR QUÉ FUNCIONA"],
        ["Dato + contradicción",
         "El 95% de emprendedores hace esto — y está mal.",
         "Stop-rate alto. Amenaza a la identidad del emprendedor."],
        ["Número + tiempo",
         "3 negocios en 7 días con $0",
         "Específico + sin barrera de entrada = bajo riesgo percibido."],
        ["Secreto oculto",
         "Nadie te dice esto sobre ganar dinero online",
         "FOMO + desconfianza activa la curiosidad."],
        ["Desde cero",
         "Si empezara de 0 mañana, haría exactamente esto",
         "Elimina objeción de ventajas previas."],
        ["Tiempo comprimido",
         "4 años de aprendizaje en 60 segundos",
         "Contraste de valor/tiempo. Obliga a quedarse."],
    ]
    story.append(dark_table(hook_data, [3.5*cm, 5.5*cm, 7*cm]))
    story.append(S(10))
    story.append(Paragraph(
        '<font color="#F5C518"><b>REGLA:</b></font> El hook debe funcionar en los primeros 2 segundos. '
        'Sin depender de música, ni de quién eres, ni de contexto previo.',
        st["Body_White"]
    ))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SEC 4 — RETENCIÓN
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("04 — ETAPA 2: RETENCIÓN POR ENCIMA DEL PROMEDIO", st["Section_Title"]))
    story.append(HR())
    story.append(S())

    story.append(Paragraph("ESTRUCTURA PARA REELS", st["Sub_Title"]))
    ret_reels = [
        ["SEGUNDO", "ACCIÓN", "OBJETIVO"],
        ["0 – 3s",   "Hook visual + verbal simultáneos. Sin intro.",          "Detener el scroll"],
        ["3 – 10s",  "Micro-promesa: 'En este video vas a aprender...'",       "Mantener al espectador"],
        ["10 – 30s", "Bloques de contenido cada 7s. Cambio visual constante.", "Evitar pausas muertas"],
        ["30 – 50s", "El dato más valioso. El 'momento de oro'.",              "Máximo watch time"],
        ["50 – 60s", "CTA directo que genera la señal específica.",            "Conversión algorítmica"],
    ]
    story.append(dark_table(ret_reels, [2.5*cm, 8*cm, 5.5*cm]))
    story.append(S(8))

    story.append(Paragraph("ESTRUCTURA PARA CARRUSELES", st["Sub_Title"]))
    ret_carr = [
        ["SLIDE", "CONTENIDO", "OBJETIVO"],
        ["Slide 1",     "Título impactante + promesa clara + 'desliza →'",    "CTR de swipe > 60%"],
        ["Slides 2-N",  "Máximo 30 palabras por slide. Una idea por slide.",  "Swipes completos"],
        ["Último slide","CTA de guarda + sigue. El más valioso.",             "Conversión a follower"],
    ]
    story.append(dark_table(ret_carr, [2.5*cm, 8.5*cm, 5*cm]))
    story.append(S(8))

    story.append(Paragraph("TÉCNICAS ANTI-PAUSA-MUERTA", st["Sub_Title"]))
    tecnicas = [
        "Jump Cut cada 5-7 segundos sin excepción.",
        "Texto en pantalla que completa lo que dices (no lo repite).",
        "Pausa de 0.5s antes de los puntos clave — crea tensión que obliga a quedarse.",
        "El dato más impactante va a los 2/3 del video, no al inicio.",
        "Finales que dan una lista rápida de pasos que el espectador quiere verificar (genera replays).",
    ]
    for t in tecnicas:
        story.append(Paragraph(f"▶  {t}", st["BulletCustom"]))

    story.append(Paragraph(
        '<font color="#F5C518"><b>REGLA DEL 70%:</b></font> Si más del 70% del público que ve el video '
        'llega al segundo 40 de un Reel de 60s, Instagram lo cataloga como contenido de alta retención '
        'y lo amplía automáticamente.',
        st["Body_White"]
    ))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SEC 5 — SEÑALES
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("05 — ETAPA 3: SEÑALES QUE ESCALAN LA ENTREGA", st["Section_Title"]))
    story.append(HR())
    story.append(S())

    signals_data = [
        ["SEÑAL", "PESO", "CÓMO FORZARLA"],
        ["Guardado",        "⭐⭐⭐⭐⭐ Muy alto",  "CTAs: 'Guarda esto para cuando lo necesites'"],
        ["Compartido",      "⭐⭐⭐⭐⭐ Muy alto",  "Contenido que resuelve problema de alguien más"],
        ["Comentario",      "⭐⭐⭐⭐ Alto",        "CTA simple: 'comenta el número', 'comenta A o B'"],
        ["Watch time >70%", "⭐⭐⭐⭐⭐ Muy alto",  "Dato de oro a los 2/3 del video"],
        ["Replay",          "⭐⭐⭐⭐ Alto",        "Finales con lista rápida de pasos a verificar"],
        ["Follow directo",  "⭐⭐⭐⭐ Alto",        "CTA explícito al final + bio con promesa clara"],
    ]
    story.append(dark_table(signals_data, [3*cm, 4*cm, 9*cm]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SEC 6 — LENGUAJE PARA DESCONOCIDOS
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("06 — ETAPA 4: LENGUAJE PARA DESCONOCIDOS", st["Section_Title"]))
    story.append(HR())
    story.append(S())

    story.append(Paragraph("LO QUE MATA EL ALCANCE", st["Sub_Title"]))
    mata = [
        "Jerga financiera sin explicación ('activos líquidos', 'apalancamiento', 'flujo de caja').",
        "Asumir que saben quién eres.",
        "Decir 'como ya saben' o 'como les mencioné antes'.",
        "Frases de autoridad no ganada: 'soy experto en...'",
    ]
    for m in mata:
        story.append(Paragraph(f"✗  {m}", st["BulletCustom"]))

    story.append(S(8))
    story.append(Paragraph("LO QUE CONVIERTE DESCONOCIDOS EN SEGUIDORES", st["Sub_Title"]))
    convierte = [
        "Hablar como si fuera la primera vez que ven contenido de negocios.",
        "Analogías cotidianas: comparar un concepto de negocios con algo de la vida diaria.",
        "'Tú' directo — no 'las personas', no 'los emprendedores'. Siempre 'tú'.",
        "Promesas verificables: no 'ganarás millones' sino 'esto te puede generar $500 extra este mes'.",
    ]
    for c in convierte:
        story.append(Paragraph(f"✓  {c}", st["BulletCustom"]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SEC 7 — SECUENCIA DE ATAQUE
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("07 — ETAPA 5: SECUENCIA DE ATAQUE (10 CONTENIDOS)", st["Section_Title"]))
    story.append(HR())
    story.append(S())

    seq_data = [
        ["#", "FORMATO", "TIPO", "OBJETIVO ALGORÍTMICO", "SEÑAL PRINCIPAL"],
        ["1", "Reel",     "3 negocios con $0",            "Alcance máximo + primer test",            "Guardados"],
        ["2", "Reel",     "El error del 80%",             "Comentarios + identificación",             "Comentarios"],
        ["3", "Carrusel", "7 verdades del dinero",        "Shares + viralidad pasiva",                "Shares"],
        ["4", "Reel",     "Nadie te dice esto",           "Retención + curiosidad",                   "Watch time"],
        ["5", "Reel",     "Por qué no saldrás del sueldo","Debate + engagement masivo",               "Comentarios debate"],
        ["6", "Carrusel", "Método de ingresos pasivos",   "Swipes completos + follows",               "Guardados + follows"],
        ["7", "Reel",     "4 años en 60 segundos",        "Watch time completo",                      "Watch time >90%"],
        ["8", "Reel",     "Si tienes menos de 30 años",   "Comentarios numerados + shares",           "Comentarios + shares"],
        ["9", "Carrusel", "Guía práctica específica",     "Guardados audiencia calificada",           "Guardados + follows"],
        ["10","Reel",     "Copia cómo hice $1,000",       "Conversión final a seguidores",            "Follows directos"],
    ]
    story.append(dark_table(seq_data, [0.8*cm, 2*cm, 3.5*cm, 5*cm, 4.7*cm]))
    story.append(S(8))

    story.append(Paragraph("LÓGICA DEL ORDEN:", st["Sub_Title"]))
    logica = [
        "Posts 1-2: Test del algoritmo con el menor riesgo. Contenido universal, más compartible.",
        "Posts 3-4: Si el algoritmo prueba bien, el carrusel viral consolida la señal.",
        "Post 5: El más polémico va cuando ya hay una pequeña base de interacciones previas.",
        "Posts 6-7: Consolidan el perfil como 'contenido de valor' ante el algoritmo.",
        "Posts 8-9: Contenido más segmentado que convierte mejor a seguidores calificados.",
        "Post 10: El blueprint final. Va último porque ya tienes base que lo puede amplificar.",
    ]
    for l in logica:
        story.append(Paragraph(f"→  {l}", st["BulletCustom"]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIOS VIRALES — helper
    # ═══════════════════════════════════════════════════════════════
    def scenario_header(num, title, concepto, formato):
        return [
            Paragraph(f"ESCENARIO {num} — {formato.upper()}", st["Section_Title"]),
            HR(ACCENT),
            S(4),
            Paragraph(title, st["Sub_Title"]),
            S(4),
            Paragraph(f'<font color="#4A9FFF"><b>CONCEPTO:</b></font> {concepto}', st["Body_White"]),
            S(6),
        ]

    def script_block(lines):
        items = []
        for line in lines:
            if line.startswith("##"):
                items.append(Paragraph(line[2:].strip(), st["Sub2_Title"]))
            elif line.startswith("["):
                items.append(Paragraph(line, st["Script_Label"]))
            else:
                items.append(Paragraph(line, st["Script"]))
            items.append(S(2))
        return items

    def signals_block(signals):
        return [
            Paragraph("SEÑALES QUE ACTIVA:", st["Sub2_Title"]),
            *[Paragraph(f"▶  {s}", st["BulletCustom"]) for s in signals],
            S(4),
        ]

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIO 1
    # ═══════════════════════════════════════════════════════════════
    story += scenario_header(
        "1", '"El empleado que ganaba más que su jefe"',
        "Historia real con giro inesperado. El cerebro no puede dejar de ver una historia con conflicto.",
        "REEL 60s"
    )
    story += script_block([
        "[0s] TEXTO EN PANTALLA: 'El empleado que ganaba más que su jefe'",
        "[0-3s] VOZ: 'Hay un empleado en una empresa de CDMX que gana más que su propio jefe.'",
        "        TEXTO: '¿Cómo?'",
        "[3-7s] VOZ: 'No por su sueldo. Por lo que hace FUERA de su trabajo.'",
        "        TEXTO: 'Lo que hace fuera de su trabajo →'",
        "[7-15s] VOZ: 'Trabaja de 9 a 6. Como todos. Pero de 7pm a 10pm construye'",
        "         VOZ: 'una segunda fuente de ingresos.'",
        "         TEXTO: '9-6 → trabajo  |  7-10pm → libertad'",
        "[15-25s] VOZ: 'No es un genio. No tenía ahorros. Empezó con $500 pesos'",
        "          VOZ: 'y una habilidad que ya tenía: saber hablar con clientes.'",
        "          TEXTO: '$500 pesos + 1 habilidad = ?'",
        "[25-38s] VOZ: 'Ofrece ese mismo servicio que hace para su empresa...'",
        "          VOZ: 'a otras empresas. Sin renunciar. Con 3 horas al día.'",
        "          TEXTO: '3 horas al día → $8,000 pesos extra al mes'",
        "[38-48s] VOZ: 'En 6 meses ganaba más en esas 3 horas que en sus 8 horas formales.'",
        "          TEXTO: 'Ingreso laboral: $12,000  |  Ingreso propio: $15,000'",
        "[48-57s] VOZ: 'La diferencia entre él y tú no es el tiempo.'",
        "          VOZ: 'Es que él decidió que las 3 horas extras trabajaran para ÉL.'",
        "[57-60s] VOZ: '¿Tienes una habilidad que alguien pagaría por tener?'",
        "          TEXTO: 'Comenta cuál es tu habilidad 👇'",
    ])
    story += signals_block([
        "Comentarios: personas diciendo su habilidad (engagement masivo fácil).",
        "Shares: 'mándaselo a X que siempre se queja del sueldo'.",
        "Watch time: la historia tiene giro, nadie se va antes del segundo 38.",
    ])
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIO 2
    # ═══════════════════════════════════════════════════════════════
    story += scenario_header(
        "2", '"El negocio que nadie quiere porque suena aburrido"',
        "Revelar algo contraintuitivo. Lo 'aburrido' que funciona genera curiosidad por contraste con las modas.",
        "REEL 45s"
    )
    story += script_block([
        "[0s] TEXTO: 'El negocio más aburrido... es el que más dinero deja'",
        "[0-4s] VOZ: 'Nadie habla de este negocio porque no suena bien en Instagram.'",
        "        VOZ: 'No es sexy. No impresiona.'",
        "        TEXTO: 'Y por eso funciona.'",
        "[4-10s] VOZ: 'Mientras todos buscan el próximo dropshipping, el próximo NFT...'",
        "         TEXTO: 'Dropshipping ❌  NFTs ❌  La próxima tendencia ❌'",
        "[10-22s] VOZ: '...hay personas ganando $20,000 - $30,000 pesos al mes con servicios'",
        "          VOZ: 'que suenan a trabajo de los años 90:'",
        "          TEXTO: 'Contabilidad → $25,000/mes'",
        "          TEXTO: 'Limpieza de oficinas → $30,000/mes'",
        "          TEXTO: 'Mantenimiento → $20,000/mes'",
        "[22-32s] VOZ: '¿Por qué funcionan? Porque las empresas SIEMPRE los necesitan.'",
        "          VOZ: 'No importa si hay crisis. No importa si cambia el algoritmo.'",
        "          TEXTO: 'Demanda constante. Sin algoritmos. Sin modas.'",
        "[32-42s] VOZ: 'El negocio perfecto no es el más interesante.'",
        "          VOZ: 'Es el que tiene clientes que SIEMPRE regresan.'",
        "[42-45s] VOZ: '¿Cuál de estos te gustaría que te explique más?'",
        "          TEXTO: 'Comenta el que quieras 👇'",
    ])
    story += signals_block([
        "Debate: los que defienden el dropshipping comentan; los de acuerdo también.",
        "Guardados: contenido de 'referencia de negocios reales'.",
        "Watch time completo: el giro del segundo 10 obliga a ver el resto.",
    ])
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIO 3
    # ═══════════════════════════════════════════════════════════════
    story += scenario_header(
        "3", '"Por qué renuncié a un trabajo de $25,000 al mes"',
        "Historia personal con números reales y decisión polémica. Los números concretos en finanzas generan detención inmediata.",
        "REEL 60s"
    )
    story += script_block([
        "[0s] TEXTO: 'Por qué renuncié a $25,000 al mes'",
        "[0-5s] VOZ: 'Renuncié a un trabajo de $25,000 pesos al mes.'",
        "        VOZ: 'Y todo el mundo pensó que estaba loco.'",
        "        TEXTO: 'Me dijeron: estás loco'",
        "[5-12s] VOZ: 'Mi jefe me dijo: estás cometiendo el error más grande de tu vida.'",
        "         VOZ: 'Mi familia dijo: eso no se hace.'",
        "[12-22s] VOZ: 'Lo que nadie vio es que ese trabajo me costaba más de lo que me pagaba.'",
        "          VOZ: '3 horas diarias de traslado. Cero control de mi tiempo.'",
        "          TEXTO: '3h diarias perdidas  |  Techo: $30,000  |  Potencial propio: ilimitado'",
        "[22-38s] VOZ: 'El primer mes sin trabajo fijo gané $8,000. Fue duro.'",
        "          TEXTO: 'Mes 1: $8,000'",
        "          TEXTO: 'Mes 3: $18,000'",
        "          TEXTO: 'Mes 6: $34,000 ✓'",
        "[38-50s] VOZ: 'No te estoy diciendo que renuncies mañana.'",
        "          VOZ: 'El sueldo seguro tiene un costo que no está en el contrato:'",
        "          TEXTO: 'Tu tiempo ✗  Tu techo ✗  Tu libertad ✗'",
        "[50-60s] VOZ: '¿Cuánto tiempo más estás dispuesto a cambiar por un número fijo?'",
        "          TEXTO: 'Comenta tu situación 👇'",
    ])
    story += signals_block([
        "Comentarios de identificación total ('yo estoy igual').",
        "Shares a personas en trabajo que odian.",
        "Alto watch time por la progresión de números mes a mes.",
    ])
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIO 4
    # ═══════════════════════════════════════════════════════════════
    story += scenario_header(
        "4", '"La calculadora que nadie te muestra"',
        "Matemática simple que cambia la perspectiva. Los números concretos tienen el mayor poder de persuasión sin necesidad de opiniones.",
        "REEL 50s"
    )
    story += script_block([
        "[0s] TEXTO: 'La calculadora que nadie te muestra'",
        "[0-5s] VOZ: 'Voy a hacerte una pregunta matemática. Respóndela con honestidad.'",
        "[5-12s] VOZ: 'Si cobras $15,000 al mes y trabajas 8 horas al día, 5 días a la semana...'",
        "         TEXTO: '$15,000 ÷ 160 horas = ?'",
        "[12-18s] VOZ: '...estás cobrando $93 pesos por hora.'",
        "          TEXTO: '$93 PESOS POR HORA'",
        "          TEXTO: '¿Cuánto vale una hora de tu vida?'",
        "[18-30s] VOZ: 'Ahora imagina que dedicas 10 horas a la semana a construir algo propio.'",
        "          VOZ: 'Solo 10 horas. En un año son 520 horas invertidas en TI.'",
        "          TEXTO: '10h/semana × 52 semanas = 520 horas'",
        "[30-42s] VOZ: 'Si en esas 520 horas construyes algo que genera $3,000 al mes...'",
        "          VOZ: 'eso es $36,000 al año. Sin jefe. Sin quincena. Sin techo.'",
        "          TEXTO: '$3,000/mes × 12 = $36,000/año'",
        "[42-50s] VOZ: 'El problema no es el tiempo. Son las 10 horas que das a Netflix.'",
        "          TEXTO: '10h Netflix vs 10h tu negocio — ¿Cuáles eliges? 👇'",
    ])
    story += signals_block([
        "Guardados: la gente guarda calculadoras de referencia.",
        "Shares: 'mándale esto a X que dice que no tiene tiempo'.",
        "Comentarios de auto-reflexión.",
    ])
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIO 5 — CARRUSEL
    # ═══════════════════════════════════════════════════════════════
    story += scenario_header(
        "5", '"El mapa del dinero que no te enseñaron en la escuela"',
        "Mapa visual de cómo funciona el dinero en la vida real. Carruseles educativos visuales tienen las tasas de guardado más altas.",
        "CARRUSEL 8 SLIDES"
    )

    slides = [
        ("SLIDE 1 — PORTADA",
         "TÍTULO: 'El mapa del dinero que no existe en ninguna escuela'\n"
         "SUBTÍTULO: '8 slides. Guárdalo.'\n"
         "FLECHA: desliza →"),
        ("SLIDE 2 — LO QUE TE ENSEÑARON",
         "DIAGRAMA: TRABAJO → SUELDO → GASTOS → FIN\n"
         "TEXTO: 'Esta es la única ruta que te mostraron. Y tiene una falla fatal:\n"
         "si paras de trabajar, el dinero se detiene.'"),
        ("SLIDE 3 — LO QUE NADIE TE DIJO",
         "DIAGRAMA: TIEMPO → HABILIDAD → PRODUCTO → DINERO → MÁS DINERO\n"
         "TEXTO: 'Cuando el dinero trabaja para ti,\nno necesitas estar presente para ganar.'"),
        ("SLIDE 4 — LOS 3 TIPOS DE INGRESO",
         "💼 ACTIVO → Cambias tiempo por dinero\n"
         "📦 SEMI-PASIVO → Construyes una vez, cobras varias\n"
         "💰 PASIVO → El dinero genera dinero\n"
         "PREGUNTA: '¿Cuántos de estos tienes ahora mismo?'"),
        ("SLIDE 5 — EL ERROR MÁS CARO",
         "TEXTO GRANDE: 'Gastar ANTES de invertir'\n"
         "MAYORÍA: Gana → Gasta → Ahorra (lo que sobra)\n"
         "LOS QUE CONSTRUYEN: Gana → Invierte primero → Vive con el resto\n"
         "'Esto se llama pagarte a ti primero.'"),
        ("SLIDE 6 — LA REGLA DEL 20%",
         "VISUAL: 80% para vivir  |  20% para crecer\n"
         "'Si inviertes solo el 20% de lo que ganas durante 5 años...\n"
         "tu vida financiera es irreconocible.'\n"
         "'No necesitas ganar más. Necesitas distribuir diferente.'"),
        ("SLIDE 7 — EL ACTIVO MÁS BARATO",
         "TEXTO: 'UNA HABILIDAD VENDIBLE'\n"
         "Las más demandadas:\n"
         "→ Ventas y negociación\n"
         "→ Marketing digital\n"
         "→ Gestión de redes sociales\n"
         "→ Diseño o edición\n"
         "'Cualquiera genera $5,000 - $20,000 pesos extras al mes.'"),
        ("SLIDE 8 — TU MAPA EN 3 PASOS (CIERRE)",
         "1️⃣ Identifica tu habilidad vendible\n"
         "2️⃣ Conviértela en ingreso activo primero\n"
         "3️⃣ Usa ese ingreso extra para crear uno semi-pasivo\n"
         "'No es complejo. Es consistente.'\n"
         "CTA: 'Guarda este mapa 🔖  Sígueme para los próximos pasos →'"),
    ]

    for slide_title, slide_content in slides:
        story.append(Paragraph(slide_title, st["Sub2_Title"]))
        for line in slide_content.split("\n"):
            story.append(Paragraph(line, st["Script"]))
            story.append(S(2))
        story.append(S(6))

    story += signals_block([
        "Guardados: contenido de referencia que la gente vuelve a ver.",
        "Shares: 'mándale esto a X que no sabe de dinero'.",
        "Follows: el slide 8 convierte directamente con CTA explícito.",
    ])
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIO 6
    # ═══════════════════════════════════════════════════════════════
    story += scenario_header(
        "6", '"Tienes 3 opciones con tu dinero — la mayoría elige la peor"',
        "Presentar opciones obliga al cerebro a elegir. Nadie puede ver un video de 'sus opciones' sin quedarse al final.",
        "REEL 55s"
    )
    story += script_block([
        "[0s] TEXTO: 'Tienes 3 opciones con tu dinero'",
        "      TEXTO: 'La mayoría elige la peor sin saberlo'",
        "[0-5s] VOZ: 'Cada peso que tienes puede ir a 3 lugares. Solo 3.'",
        "        VOZ: 'Y la mayoría los usa en el orden equivocado.'",
        "[5-15s] VOZ: 'OPCIÓN 1: Gastarlo. Ropa, comida, entretenimiento.'",
        "         VOZ: 'Resultado: el dinero desaparece. Aporta 0 a tu futuro.'",
        "         TEXTO: 'OPCIÓN 1: GASTO → resultado: $0'",
        "[15-28s] VOZ: 'OPCIÓN 2: Ahorrarlo. En el banco, debajo del colchón.'",
        "          VOZ: 'Resultado: el dinero no desaparece... pero tampoco crece.'",
        "          VOZ: 'La inflación lo come lentamente.'",
        "          TEXTO: 'OPCIÓN 2: AHORRO → resultado: se encoge'",
        "[28-45s] VOZ: 'OPCIÓN 3: Hacerlo trabajar. En una habilidad, negocio, inversión.'",
        "          VOZ: 'Resultado: ese peso te genera más pesos. Sin que hagas nada extra.'",
        "          TEXTO: 'OPCIÓN 3: INVERSIÓN → resultado: crece solo'",
        "[45-52s] VOZ: 'La mayoría usa el 90% en la Opción 1, el 10% en la 2,'",
        "          VOZ: 'y CERO en la 3. Y luego se pregunta por qué nunca tiene suficiente.'",
        "          TEXTO: '90% gastar | 10% ahorrar | 0% invertir'",
        "[52-55s] VOZ: 'Comenta qué porcentaje usas en cada una.'",
        "          TEXTO: 'Comenta: X% - X% - X% 👇'",
    ])
    story += signals_block([
        "Comentarios de auto-diagnóstico (la gente responde con sus porcentajes).",
        "Watch time: el formato de '3 opciones' obliga a ver hasta el final.",
        "Shares: 'mándale esto a X que solo gasta'.",
    ])
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # ESCENARIO 7
    # ═══════════════════════════════════════════════════════════════
    story += scenario_header(
        "7", '"El experimento de los $100 pesos"',
        "Historia de experimento real o basado en hechos. Los experimentos con dinero son verificables y retadores — viralidad comprobada.",
        "REEL 60s"
    )
    story += script_block([
        "[0s] TEXTO: 'Le di $100 pesos a dos personas'",
        "      TEXTO: 'Lo que pasó después lo cambió todo'",
        "[0-6s] VOZ: 'Hice un experimento simple. Le di $100 pesos a dos personas'",
        "        VOZ: 'y les dije: haz lo que quieras con esto.'",
        "[6-18s] VOZ: 'La primera persona fue al OXXO.'",
        "         VOZ: 'Compró una bebida, unas papas, un chocolate.'",
        "         VOZ: 'En 10 minutos: $0.'",
        "         TEXTO: 'Persona A: $100 → snacks → $0 en 10 min'",
        "[18-35s] VOZ: 'La segunda persona fue a su celular.'",
        "          VOZ: 'Compró materiales digitales para aprender a hacer flyers.'",
        "          VOZ: 'En 2 semanas ofreció el servicio a 3 negocios locales.'",
        "          VOZ: 'Cobró $300 por flyer. Con $100 generó $900.'",
        "          TEXTO: 'Persona B: $100 → habilidad → $900 en 2 semanas'",
        "[35-48s] VOZ: 'La diferencia no fue el dinero. Fue la pregunta que cada uno se hizo:'",
        "          VOZ: '¿esto me da placer ahora... o me da más en el futuro?'",
        "          TEXTO: 'Placer ahora  vs  Más después'",
        "[48-57s] VOZ: 'Cada decisión financiera que tomas hoy es el mismo experimento.'",
        "          VOZ: '¿En qué dirección va tu dinero?'",
        "[57-60s] VOZ: 'Comenta: ¿A o B? ¿Cuál eres tú?'",
        "          TEXTO: '¿Eres A o B? Comenta 👇'",
    ])
    story += signals_block([
        "Comentarios binarios (A o B) = máxima facilidad = volumen alto.",
        "Shares entre amigos que se reconocen en uno de los dos.",
        "Alto watch time por el giro del resultado.",
    ])
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # PLAN DE PUBLICACIÓN
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("15 — PLAN DE PUBLICACIÓN SEMANAL", st["Section_Title"]))
    story.append(HR())
    story.append(S())

    plan_data = [
        ["SEMANA", "DÍA", "ESCENARIO", "FORMATO", "META PRINCIPAL"],
        ["1", "Martes",   "Escenario 4 — La Calculadora",      "Reel",     "Guardados + primer test"],
        ["1", "Viernes",  "Escenario 5 — Mapa del Dinero",     "Carrusel", "Shares + follows"],
        ["2", "Martes",   "Escenario 1 — El Empleado",         "Reel",     "Comentarios + identificación"],
        ["2", "Jueves",   "Escenario 6 — 3 Opciones",          "Reel",     "Comentarios masivos"],
        ["3", "Martes",   "Escenario 2 — Negocio Aburrido",    "Reel",     "Debate + engagement"],
        ["3", "Viernes",  "Escenario 7 — Los $100 Pesos",      "Reel",     "Shares + comentarios A/B"],
        ["4", "Martes",   "Escenario 3 — Renuncié a $25k",     "Reel",     "Watch time + follows directos"],
    ]
    story.append(dark_table(plan_data, [1.8*cm, 2.5*cm, 5.5*cm, 2.5*cm, 5.7*cm]))
    story.append(S(10))

    story.append(Paragraph("REGLAS DE PUBLICACIÓN", st["Sub_Title"]))
    pub_data = [
        ["VARIABLE", "RECOMENDACIÓN"],
        ["Frecuencia",    "1 Reel + 1 Carrusel cada 3-4 días las primeras 2 semanas"],
        ["Horario",       "Martes-Jueves, 7-9am o 7-9pm (hora local de tu audiencia)"],
        ["Caption",       "Máx 3 líneas visibles. Primera línea = extensión del hook."],
        ["Hashtags",      "3-5 hashtags de nicho medio (50k-500k posts). Nunca los gigantes."],
        ["Audio Reels",   "Trending pero en volumen bajo (30%). Tu voz es la señal principal."],
        ["Portada Reel",  "Texto legible en 2 segundos. El texto hace el trabajo, no la cara."],
    ]
    story.append(dark_table(pub_data, [3.5*cm, 12.5*cm]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # RESULTADO ESPERADO
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("16 — RESULTADO ESPERADO SEMANA A SEMANA", st["Section_Title"]))
    story.append(HR())
    story.append(S())

    result_data = [
        ["SEMANA", "ESTADO DEL ALGORITMO", "ALCANCE ESPERADO", "SEGUIDORES"],
        ["1 (Posts 1-3)",
         "Instagram te identifica como perfil Negocios/Dinero",
         "500 – 5,000 por publicación",
         "0 – 100"],
        ["2 (Posts 4-6)",
         "Primera expansión a Explorar si hay >3% engagement",
         "5,000 – 30,000",
         "100 – 500"],
        ["3 (Posts 7-9)",
         "Audiencia calificada comienza a seguir el patrón de valor",
         "10,000 – 50,000",
         "500 – 1,000"],
        ["4 (Post 10+)",
         "Perfil establecido como referencia en el nicho",
         "20,000 – 100,000+",
         "1,000 – 2,000+"],
    ]
    story.append(dark_table(result_data, [2.5*cm, 5.5*cm, 4*cm, 4*cm]))
    story.append(S(16))

    story.append(HR(GOLD, 2))
    story.append(S(8))
    story.append(Paragraph(
        "MODO INGENIERIA · Estrategia Instagram Negocios/Dinero · 2026",
        st["Footer_Text"]
    ))
    story.append(Paragraph(
        "Ejecuta como un ingeniero de alcance, no como un creador principiante.",
        st["Sub_Title"]
    ))

    # ── Build ──
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF generado: {out}")

build()
