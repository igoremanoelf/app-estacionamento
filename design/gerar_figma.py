"""Gera os ecrãs do protótipo (SVG, 390x844) para importar no Figma.

Uso: python3 design/gerar_figma.py
Saída: design/figma/*.svg (um por ecrã) + design/figma/00_quadro.svg (todos lado a lado)
As cores e textos seguem src/theme/index.ts e os ecrãs em src/screens.
"""
from pathlib import Path
from xml.sax.saxutils import escape

C = dict(primary='#1565C0', primaryDark='#0D47A1', primaryLight='#E3F2FD', accent='#00A884',
         bg='#F4F6FA', surface='#FFFFFF', text='#1B2430', muted='#667085', border='#E1E5EC',
         danger='#D93025', dangerL='#FDECEA', warning='#F29900', warningL='#FFF4E0',
         success='#188038', successL='#E6F4EA', free='#34A853', occ='#EA4335', res='#FBBC04',
         dis='#9AA0A6')
W, H = 390, 844
FONT = "Inter, -apple-system, 'SF Pro Text', Helvetica, Arial, sans-serif"


class S:
    def __init__(self, name, title):
        self.name, self.title, self.el = name, title, []

    def add(self, s):
        self.el.append(s)

    def rect(self, x, y, w, h, fill, r=0, stroke=None, name=None):
        st = f' stroke="{stroke}" stroke-width="1"' if stroke else ''
        nm = f' id="{escape(name)}"' if name else ''
        self.add(f'<rect{nm} x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{st}/>')

    def text(self, x, y, t, size=15, fill=C['text'], weight=400, anchor='start'):
        self.add(f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" '
                 f'fill="{fill}" text-anchor="{anchor}">{escape(t)}</text>')

    def circle(self, cx, cy, r, fill, stroke=None):
        st = f' stroke="{stroke}" stroke-width="2"' if stroke else ''
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{st}/>')

    # --- componentes ---
    def status_bar(self, dark=False):
        f = '#FFFFFF' if dark else C['text']
        self.text(28, 34, '9:41', 16, f, 600)
        self.rect(332, 24, 26, 12, 'none', 3, f)
        self.rect(334, 26, 18, 8, f, 2)

    def header(self, title, back=None, right=None):
        self.rect(0, 0, W, 100, C['surface'])
        self.add(f'<line x1="0" y1="100" x2="{W}" y2="100" stroke="{C["border"]}"/>')
        self.status_bar()
        if back:
            self.text(16, 78, '‹ ' + back, 17, C['primary'])
            self.text(W / 2, 78, title, 17, C['text'], 600, 'middle')
        else:
            self.text(16, 82, title, 26, C['text'], 700)
        if right:
            self.circle(354, 72, 16, C['primaryLight'])
            self.text(354, 77, right, 13, C['primary'], 700, 'middle')

    def tabs(self, items, active):
        y = H - 84
        self.rect(0, y, W, 84, C['surface'])
        self.add(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="{C["border"]}"/>')
        n = len(items)
        for i, (icon, label) in enumerate(items):
            cx = W / n * (i + .5)
            col = C['primary'] if i == active else C['muted']
            self.text(cx, y + 30, icon, 20, col, 400, 'middle')
            self.text(cx, y + 50, label, 11, col, 600 if i == active else 400, 'middle')
        self.rect(W / 2 - 67, H - 13, 134, 5, C['text'], 3)

    def card(self, x, y, w, h):
        self.rect(x, y, w, h, C['surface'], 16, C['border'])

    def button(self, x, y, w, label, kind='primary', h=50):
        fill = {'primary': C['primary'], 'outline': C['surface'], 'danger': C['dangerL'], 'accent': C['accent']}[kind]
        stroke = C['primary'] if kind == 'outline' else None
        col = {'primary': '#FFFFFF', 'outline': C['primary'], 'danger': C['danger'], 'accent': '#FFFFFF'}[kind]
        self.rect(x, y, w, h, fill, 12, stroke, f'Botão / {label}')
        self.text(x + w / 2, y + h / 2 + 5, label, 16, col, 600, 'middle')

    def field(self, x, y, w, label, value, placeholder=False):
        self.text(x, y, label, 13, C['muted'], 500)
        self.rect(x, y + 8, w, 48, C['surface'], 10, C['border'])
        self.text(x + 14, y + 38, value, 15, C['muted'] if placeholder else C['text'])

    def badge(self, x, y, label, fg, bg):
        w = len(label) * 7 + 18
        self.rect(x, y, w, 24, bg, 12)
        self.text(x + w / 2, y + 16, label, 12, fg, 600, 'middle')
        return w

    def row(self, x, y, w, label, value, bold=False):
        self.text(x, y, label, 14, C['muted'])
        self.text(x + w, y, value, 14, C['text'], 600 if bold else 400, 'end')

    def svg(self, ox=0, oy=0, standalone=True):
        body = ''.join(self.el)
        g = (f'<g id="{escape(self.name)}" transform="translate({ox},{oy})">'
             f'<rect width="{W}" height="{H}" rx="0" fill="{C["bg"]}"/>{body}</g>')
        if standalone:
            return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
                    f'viewBox="0 0 {W} {H}">{g}</svg>')
        return g


UT = [('⌂', 'Início'), ('▦', 'Parque'), ('◷', 'Histórico'), ('◉', 'Perfil')]
GT = [('◔', 'Painel'), ('▦', 'Lugares'), ('▣', 'Ler QR'), ('☰', 'Reservas'), ('◎', 'Utentes')]
AT = [('◔', 'Painel'), ('▦', 'Lugares'), ('☰', 'Reservas'), ('◎', 'Contas'), ('⚙', 'Gestão')]


def spot_grid(s, x0, y0, zone, states, sel=None, size=40, gap=8):
    s.text(x0, y0 - 10, f'Zona {zone}', 14, C['text'], 600)
    col = dict(L=C['free'], O=C['occ'], R=C['res'], D=C['dis'])
    for i, st in enumerate(states):
        x = x0 + (i % 6) * (size + gap)
        y = y0 + (i // 6) * (size + gap)
        code = f'{zone}{i + 1:02d}'
        fill = C['primary'] if code == sel else col[st]
        s.rect(x, y, size, size, fill, 8)
        s.text(x + size / 2, y + size / 2 + 4, code, 11, '#FFFFFF', 600, 'middle')


def legend(s, y):
    x = 16
    for lab, c in [('Livre', C['free']), ('Ocupado', C['occ']), ('Reservado', C['res']), ('Inativo', C['dis'])]:
        s.rect(x, y - 10, 12, 12, c, 3)
        s.text(x + 18, y, lab, 12, C['muted'])
        x += 30 + len(lab) * 7


ZA = list('LLOLRLOOLLLD')
ZB = list('LOLLRLLOOLLL')


def qr(s, x, y, n=21, cell=8):
    import random
    rnd = random.Random(7)
    s.rect(x - 12, y - 12, n * cell + 24, n * cell + 24, '#FFFFFF', 12, C['border'])
    for i in range(n):
        for j in range(n):
            finder = any(a <= i < a + 7 and b <= j < b + 7 for a, b in [(0, 0), (0, n - 7), (n - 7, 0)])
            if finder:
                ii, jj = i % (n - 7) if i >= n - 7 else i, j % (n - 7) if j >= n - 7 else j
                on = ii in (0, 6) or jj in (0, 6) or (2 <= ii <= 4 and 2 <= jj <= 4)
            else:
                on = rnd.random() < .5
            if on:
                s.rect(x + j * cell, y + i * cell, cell, cell, C['text'])


def screens():
    out = []

    s = S('01 Login', 'Login')
    s.rect(0, 0, W, 330, C['primary'])
    s.status_bar(dark=True)
    s.circle(W / 2, 150, 44, '#FFFFFF')
    s.text(W / 2, 166, 'P', 46, C['primary'], 800, 'middle')
    s.text(W / 2, 240, 'ParkSmart', 32, '#FFFFFF', 700, 'middle')
    s.text(W / 2, 268, 'Estacionamento inteligente', 16, C['primaryLight'], 400, 'middle')
    s.card(16, 300, W - 32, 380)
    s.field(36, 336, W - 72, 'Email', 'utente@email.pt')
    s.field(36, 416, W - 72, 'Password', '••••••••')
    s.button(36, 500, W - 72, 'Entrar')
    s.text(W / 2, 584, 'Esqueci-me da password', 15, C['primary'], 500, 'middle')
    s.button(36, 610, W - 72, 'Criar conta de utente', 'outline')
    out.append(s)

    s = S('02 Criar conta', 'Criar conta')
    s.header('Criar conta', 'Voltar')
    y = 130
    for lab, val in [('Nome', 'Ana Martins'), ('Email', 'ana@email.pt'), ('Telemóvel', '912 345 678'),
                     ('Parque habitual', 'Parque Central  ▾'), ('Password', '••••••••'),
                     ('Confirmar password', '••••••••')]:
        s.field(16, y, W - 32, lab, val)
        y += 82
    s.button(16, y + 10, W - 32, 'Criar conta')
    s.text(W / 2, y + 90, 'A conta fica pendente até ser ativada pelo gestor.', 13, C['muted'], 400, 'middle')
    out.append(s)

    s = S('03 Utente - Início', 'Início')
    s.header('Olá, Ana', right='AM')
    s.card(16, 120, W - 32, 150)
    s.text(32, 152, 'Parque Central', 18, C['text'], 700)
    s.badge(290, 136, 'Aberto', C['success'], C['successL'])
    s.row(32, 190, W - 64, 'Horário', '08:00 – 22:00')
    s.row(32, 218, W - 64, 'Lugares livres agora', '15 / 24', True)
    s.rect(32, 236, W - 64, 10, C['border'], 5)
    s.rect(32, 236, (W - 64) * 15 / 24, 10, C['free'], 5)
    s.text(16, 306, 'Reservar', 18, C['text'], 700)
    for i, (t, d, ic) in enumerate([('Marcação antecipada', 'Escolha o dia, hora e lugar', '◷'),
                                    ('Lugar agora', 'Pedido à entrada', '➜'),
                                    ('Avença', 'Mensal', '★')]):
        y = 322 + i * 74
        s.card(16, y, W - 32, 62)
        s.circle(48, y + 31, 18, C['primaryLight'])
        s.text(48, y + 37, ic, 16, C['primary'], 700, 'middle')
        s.text(78, y + 27, t, 15, C['text'], 600)
        s.text(78, y + 47, d, 13, C['muted'])
        s.text(W - 36, y + 37, '›', 22, C['muted'], 400, 'middle')
    s.text(16, 570, 'Bilhetes ativos', 18, C['text'], 700)
    s.card(16, 586, W - 32, 92)
    s.text(32, 616, 'Lugar A03 · AA-00-AA', 15, C['text'], 600)
    s.badge(282, 600, 'Reserva', C['primary'], C['primaryLight'])
    s.text(32, 642, 'Hoje 14:00 → 18:00', 14, C['muted'])
    s.text(32, 664, '4,80 € pago', 14, C['success'], 600)
    s.tabs(UT, 0)
    out.append(s)

    s = S('04 Utente - Parque', 'Parque')
    s.header('Parque', right='AM')
    s.card(16, 116, W - 32, 64)
    for i, (n, l, c) in enumerate([('15', 'Livres', C['free']), ('5', 'Ocupados', C['occ']), ('3', 'Reservados', C['res'])]):
        cx = 16 + (W - 32) / 3 * (i + .5)
        s.text(cx, 146, n, 22, c, 700, 'middle')
        s.text(cx, 166, l, 12, C['muted'], 400, 'middle')
    legend(s, 212)
    s.card(16, 228, W - 32, 470)
    spot_grid(s, 44, 272, 'A', ZA)
    s.rect(32, 384, W - 64, 34, C['bg'], 6)
    s.text(W / 2, 406, '← corredor de circulação →', 12, C['muted'], 400, 'middle')
    spot_grid(s, 44, 456, 'B', ZB)
    s.text(W / 2, 600, 'Vista em tempo real do parque.', 13, C['muted'], 400, 'middle')
    s.text(W / 2, 620, 'Toque num lugar livre para reservar.', 13, C['muted'], 400, 'middle')
    s.tabs(UT, 1)
    out.append(s)

    s = S('05 Nova reserva', 'Nova reserva')
    s.header('Nova reserva', 'Voltar')
    s.card(16, 116, W - 32, 150)
    s.text(32, 144, 'Período', 16, C['text'], 700)
    s.field(32, 164, (W - 80) / 2, 'Entrada', '08/10 14:00')
    s.field(48 + (W - 80) / 2, 164, (W - 80) / 2, 'Saída', '08/10 18:00')
    s.card(16, 278, W - 32, 92)
    s.text(32, 306, 'Veículo', 16, C['text'], 700)
    s.rect(32, 318, 150, 38, C['primaryLight'], 19, C['primary'])
    s.text(107, 342, '🚗 AA-00-AA', 14, C['primary'], 600, 'middle')
    s.rect(192, 318, 120, 38, C['surface'], 19, C['border'])
    s.text(252, 342, '+ Matrícula', 14, C['muted'], 500, 'middle')
    s.card(16, 382, W - 32, 236)
    s.text(32, 410, 'Escolha o lugar', 16, C['text'], 700)
    spot_grid(s, 44, 440, 'A', ZA, sel='A04', size=36, gap=10)
    s.text(32, 600, 'Lugar selecionado: A04', 14, C['primary'], 600)
    s.card(16, 630, W - 32, 92)
    s.text(32, 656, 'Resumo', 16, C['text'], 700)
    s.row(32, 682, W - 64, 'Lugar · Duração', 'A04 · 4 h')
    s.row(32, 706, W - 64, 'Preço (1,20 €/h)', '4,80 €', True)
    s.button(16, 740, W - 32, 'Confirmar e pagar')
    out.append(s)

    s = S('06 Bilhete', 'Bilhete')
    s.header('Bilhete', 'Voltar')
    s.card(16, 116, W - 32, 300)
    s.text(W / 2, 148, 'Apresente à entrada e à saída', 14, C['muted'], 400, 'middle')
    qr(s, W / 2 - 84, 170)
    s.text(W / 2, 400, 'Parque Central · Lugar A04', 15, C['text'], 600, 'middle')
    s.card(16, 428, W - 32, 170)
    s.text(32, 456, 'Detalhes', 16, C['text'], 700)
    for i, (a, b) in enumerate([('Tipo', 'Reserva'), ('Matrícula', 'AA-00-AA'), ('Entrada', '08/10 14:00'),
                                ('Saída', '08/10 18:00'), ('Total pago', '4,80 €')]):
        s.row(32, 484 + i * 24, W - 64, a, b, a == 'Total pago')
    s.button(16, 614, W - 32, 'Alterar reserva', 'outline')
    s.button(16, 676, W - 32, 'Cancelar reserva', 'danger')
    out.append(s)

    s = S('07 Utente - Histórico', 'Histórico')
    s.header('Histórico', right='AM')
    x = 16
    for i, t in enumerate(['Todas', 'Ativas', 'Terminadas']):
        w = len(t) * 8 + 28
        s.rect(x, 116, w, 34, C['primary'] if i == 0 else C['surface'], 17, None if i == 0 else C['border'])
        s.text(x + w / 2, 138, t, 14, '#FFFFFF' if i == 0 else C['text'], 600, 'middle')
        x += w + 8
    s.text(16, 186, '🚗 AA-00-AA', 15, C['text'], 700)
    items = [('A04 · Reserva', '08/10 14:00 → 18:00', '4,80 €', 'Ativa', C['primary'], C['primaryLight']),
             ('B02 · Lugar agora', '05/10 09:12 → 11:40', '3,00 €', 'Terminada', C['muted'], C['bg']),
             ('A07 · Reserva', '01/10 08:00 → 17:00', '10,80 €', 'Terminada', C['muted'], C['bg']),
             ('Avença · Setembro', '01/09 → 30/09', '60,00 €', 'Terminada', C['muted'], C['bg'])]
    for i, (t, d, p, st, fg, bg) in enumerate(items):
        y = 200 + i * 90
        s.card(16, y, W - 32, 78)
        s.text(32, y + 30, t, 15, C['text'], 600)
        s.text(32, y + 54, d, 13, C['muted'])
        s.text(W - 32, y + 54, p, 14, C['text'], 600, 'end')
        bw = len(st) * 7 + 18
        s.badge(W - 32 - bw, y + 14, st, fg, bg)
    s.tabs(UT, 2)
    out.append(s)

    s = S('08 Perfil', 'Perfil')
    s.header('Perfil')
    s.circle(W / 2, 170, 46, C['primaryLight'])
    s.text(W / 2, 185, 'AM', 30, C['primary'], 700, 'middle')
    s.text(W / 2, 246, 'Ana Martins', 20, C['text'], 700, 'middle')
    s.text(W / 2, 270, 'ana@email.pt · Utente', 14, C['muted'], 400, 'middle')
    s.field(16, 300, W - 32, 'Nome', 'Ana Martins')
    s.field(16, 380, W - 32, 'Telemóvel', '912 345 678')
    s.card(16, 460, W - 32, 118)
    s.text(32, 488, 'Veículos', 16, C['text'], 700)
    s.row(32, 518, W - 64, '🚗 AA-00-AA', 'Carro')
    s.text(32, 556, '+ Adicionar veículo', 15, C['primary'], 600)
    s.button(16, 596, W - 32, 'Guardar')
    s.button(16, 658, W - 32, 'Terminar sessão', 'danger')
    s.tabs(UT, 3)
    out.append(s)

    s = S('09 Gestor - Painel', 'Painel')
    s.header('Painel', right='GD')
    s.card(16, 116, W - 32, 170)
    s.text(32, 144, 'Ocupação', 16, C['text'], 700)
    cx, cy, r = 100, 216, 48
    import math
    s.circle(cx, cy, r, 'none', C['border'])
    frac = 9 / 24
    a = 2 * math.pi * frac
    ex, ey = cx + r * math.sin(a), cy - r * math.cos(a)
    s.add(f'<path d="M{cx},{cy - r} A{r},{r} 0 {1 if frac > .5 else 0},1 {ex:.1f},{ey:.1f}" fill="none" '
          f'stroke="{C["occ"]}" stroke-width="12" stroke-linecap="round"/>')
    s.text(cx, cy + 8, '38%', 22, C['text'], 700, 'middle')
    for i, (l, v, c) in enumerate([('Livres', '15', C['free']), ('Ocupados', '9', C['occ']), ('A chegar', '3', C['res'])]):
        y = 186 + i * 32
        s.circle(186, y - 5, 6, c)
        s.text(200, y, l, 14, C['muted'])
        s.text(W - 32, y, v, 16, C['text'], 700, 'end')
    s.card(16, 298, W - 32, 140)
    s.text(32, 326, 'Previsão de desocupação', 16, C['text'], 700)
    for i, (l, v) in enumerate([('Na próxima hora', '2'), ('Nas próximas 3 horas', '5'), ('Sem hora de saída prevista', '2')]):
        s.row(32, 358 + i * 28, W - 64, l, v, True)
    s.card(16, 450, W - 32, 110)
    s.text(32, 478, 'Alertas', 16, C['text'], 700)
    s.badge(W - 60, 462, '2', '#FFFFFF', C['danger'])
    s.rect(32, 492, W - 64, 54, C['warningL'], 10)
    s.text(46, 514, '⚠ AB-12-CD excedeu a hora de saída', 13, C['text'], 600)
    s.text(46, 534, 'Lugar B05 · há 25 min', 12, C['muted'])
    s.button(16, 576, (W - 44) / 2, 'Estatísticas', 'outline')
    s.button(28 + (W - 44) / 2, 576, (W - 44) / 2, 'Alertas', 'outline')
    s.tabs(GT, 0)
    out.append(s)

    s = S('10 Gestor - Ler QR', 'Ler QR')
    s.header('Ler QR', right='GD')
    s.rect(16, 116, W - 32, 360, '#11161D', 16)
    for (x, y, dx, dy) in [(95, 196, 1, 1), (295, 196, -1, 1), (95, 396, 1, -1), (295, 396, -1, -1)]:
        s.add(f'<path d="M{x},{y + 36 * dy} L{x},{y} L{x + 36 * dx},{y}" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>')
    s.text(W / 2, 452, 'Aponte a câmara ao QR Code do bilhete', 13, '#FFFFFF', 400, 'middle')
    s.card(16, 490, W - 32, 140)
    s.circle(52, 530, 18, C['successL'])
    s.text(52, 536, '✓', 18, C['success'], 700, 'middle')
    s.text(82, 526, 'Entrada registada', 16, C['success'], 700)
    s.text(82, 546, 'AA-00-AA · Lugar A04 · 14:02', 13, C['muted'])
    s.button(32, 566, W - 64, 'Ler outro código', 'outline', 46)
    s.text(W / 2, 664, 'Sem QR Code? Procurar por matrícula', 15, C['primary'], 600, 'middle')
    s.tabs(GT, 2)
    out.append(s)

    s = S('11 Gestor - Utentes', 'Utentes')
    s.header('Utentes', right='GD')
    s.rect(16, 116, W - 32, 44, C['surface'], 12, C['border'])
    s.text(32, 144, '⌕  Procurar por nome ou email', 15, C['muted'])
    rows = [('Rui Costa', 'rui@email.pt', 'Pendente', C['warning'], C['warningL']),
            ('Ana Martins', 'ana@email.pt', 'Ativo', C['success'], C['successL']),
            ('Marta Silva', 'marta@email.pt', 'Ativo', C['success'], C['successL']),
            ('João Pires', 'joao@email.pt', 'Bloqueado', C['danger'], C['dangerL'])]
    for i, (n, e, st, fg, bg) in enumerate(rows):
        y = 176 + i * 80
        s.card(16, y, W - 32, 68)
        s.circle(50, y + 34, 18, C['primaryLight'])
        s.text(50, y + 39, ''.join(p[0] for p in n.split()), 13, C['primary'], 700, 'middle')
        s.text(80, y + 30, n, 15, C['text'], 600)
        s.text(80, y + 50, e, 13, C['muted'])
        bw = len(st) * 7 + 18
        s.badge(W - 32 - bw, y + 22, st, fg, bg)
    s.button(16, 506, W - 32, 'Ativar conta de Rui Costa', 'accent')
    s.tabs(GT, 4)
    out.append(s)

    s = S('12 Admin - Gestão', 'Gestão')
    s.header('Gestão', right='AD')
    groups = [('Parque', [('Configurar parque', 'Nome, horário e lugares'), ('Preços', 'Preço por hora e avenças mensais'),
                          ('Veículos', 'Todos os veículos que usaram o parque')]),
              ('Operação', [('Ler QR Code', 'Registar entradas e saídas'), ('Estatísticas', ''), ('Alertas', ''),
                            ('Histórico de reservas', 'Reset do histórico')]),
              ('Conta', [('O meu perfil', ''), ('Terminar sessão', '')])]
    y = 116
    for g, items in groups:
        s.text(20, y + 14, g.upper(), 12, C['muted'], 600)
        y += 24
        s.card(16, y, W - 32, len(items) * 56)
        for i, (t, d) in enumerate(items):
            yy = y + i * 56
            if i:
                s.add(f'<line x1="32" y1="{yy}" x2="{W - 16}" y2="{yy}" stroke="{C["border"]}"/>')
            col = C['danger'] if t == 'Terminar sessão' else C['text']
            s.text(32, yy + (24 if d else 34), t, 15, col, 600)
            if d:
                s.text(32, yy + 44, d, 13, C['muted'])
            s.text(W - 36, yy + 35, '›', 22, C['muted'], 400, 'middle')
        y += len(items) * 56 + 16
    s.tabs(AT, 4)
    out.append(s)

    s = S('13 Admin - Preços', 'Preços')
    s.header('Preços', 'Voltar')
    y = 116
    for g, vals in [('Preço por hora', ('1,20', '0,60', '1,80')), ('Preço por dia', ('12,00', '6,00', '18,00')),
                    ('Avença mensal', ('60,00', '30,00', '90,00'))]:
        s.card(16, y, W - 32, 118)
        s.text(32, y + 28, g, 16, C['text'], 700)
        for i, (veh, v) in enumerate(zip(['Carro', 'Mota', 'Carrinha'], vals)):
            x = 32 + i * ((W - 64) / 3)
            s.field(x, y + 52, (W - 64) / 3 - 10, veh, v + ' €')
        y += 132
    s.button(16, y + 8, W - 32, 'Guardar preços')
    s.text(W / 2, y + 86, 'Os novos preços aplicam-se às próximas reservas.', 13, C['muted'], 400, 'middle')
    out.append(s)

    return out


def main():
    out_dir = Path(__file__).parent / 'figma'
    out_dir.mkdir(parents=True, exist_ok=True)
    scr = screens()
    for s in scr:
        (out_dir / f'{s.name}.svg').write_text(s.svg(), encoding='utf-8')
    cols, gap, top = 5, 80, 120
    rows = (len(scr) + cols - 1) // cols
    BW, BH = cols * W + (cols + 1) * gap, rows * (H + top) + gap
    parts = [f'<rect width="{BW}" height="{BH}" fill="#E9ECF2"/>',
             f'<text x="{gap}" y="70" font-family="{FONT}" font-size="40" font-weight="700" fill="{C["text"]}">'
             f'ParkSmart — protótipo (utente · gestor · administrador)</text>']
    for i, s in enumerate(scr):
        ox = gap + (i % cols) * (W + gap)
        oy = top + (i // cols) * (H + top)
        parts.append(f'<text x="{ox}" y="{oy - 16}" font-family="{FONT}" font-size="20" font-weight="600" '
                     f'fill="{C["muted"]}">{escape(s.name)}</text>')
        parts.append(s.svg(ox, oy, standalone=False))
    (out_dir / '00_quadro.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{BW}" height="{BH}" viewBox="0 0 {BW} {BH}">'
        + ''.join(parts) + '</svg>', encoding='utf-8')
    print(f'{len(scr)} ecrãs em {out_dir}')


if __name__ == '__main__':
    main()
