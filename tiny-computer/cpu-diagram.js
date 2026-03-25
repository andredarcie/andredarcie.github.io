(function () {
    var NS  = 'http://www.w3.org/2000/svg';
    var W   = 720, H = 360;

    // ── LAYOUT ───────────────────────────────────────────
    var CU  = { x: 2, y: 2,   w: 716, h: 64  };
    var RF  = { x: 2, y: 80,  w: 716, h: 70  };
    var BUS_Y = 165;
    var ALU = { x: 2, y: 198, w: 716, h: 152 };

    var REGS = [
        { id: 0, label: 'P0', cx: 78,  bx: 18  },
        { id: 1, label: 'P1', cx: 258, bx: 198 },
        { id: 2, label: 'P2', cx: 438, bx: 378 },
        { id: 3, label: 'P3', cx: 618, bx: 558 }
    ];

    var GATES = [
        { id: 'ADD',  sym: 'arith', op: '+',  label: 'ADD',  x: 10  },
        { id: 'SUB',  sym: 'arith', op: '\u2212', label: 'SUB',  x: 88  },
        { id: 'MULT', sym: 'arith', op: '\u00d7', label: 'MUL',  x: 166 },
        { id: 'DIV',  sym: 'arith', op: '\u00f7', label: 'DIV',  x: 244 },
        { id: 'AND',  sym: 'and',              label: 'AND',  x: 330 },
        { id: 'OR',   sym: 'or',               label: 'OR',   x: 412 },
        { id: 'NOT',  sym: 'not',              label: 'NOT',  x: 492 },
        { id: 'CMP',  sym: 'arith', op: '\u2276', label: 'CMP',  x: 570 },
        { id: 'JMP',  sym: 'arith', op: '\u21bb', label: 'JMP',  x: 648 }
    ];

    var OP_GATE = {
        ADD: 'ADD', SUB: 'SUB', MULT: 'MULT', DIV: 'DIV',
        AND: 'AND', OR:  'OR',  NOT: 'NOT',
        BT:  'CMP', ST:  'CMP', EQUAL: 'CMP',
        JUMP: 'JMP', JUMPC: 'JMP'
    };

    var GW = 62, GH = 52, svg;

    // ── SVG HELPERS ──────────────────────────────────────
    function mk(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function txt(str, attrs, parent) {
        var t = mk('text', attrs, parent);
        t.textContent = str;
        return t;
    }

    // ── DEFS (glow filters) ──────────────────────────────
    function addDefs() {
        var defs = mk('defs', {}, svg);

        function glow(id, color, dev) {
            var f = mk('filter', { id: id, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
            var flood = mk('feFlood', { 'flood-color': color, 'flood-opacity': '0.6', result: 'color' }, f);
            mk('feComposite', { in: 'color', in2: 'SourceGraphic', operator: 'in', result: 'coloredSrc' }, f);
            mk('feGaussianBlur', { in: 'coloredSrc', stdDeviation: dev, result: 'blur' }, f);
            var merge = mk('feMerge', {}, f);
            mk('feMergeNode', { in: 'blur' }, merge);
            mk('feMergeNode', { in: 'SourceGraphic' }, merge);
        }

        glow('glow-green', '#00ff41', '3');
        glow('glow-amber', '#ffb300', '3');
    }

    // ── BLOCK (panel rectangle) ──────────────────────────
    function block(cfg, labelText, id) {
        var g = mk('g', { id: id, class: 'dblock' }, svg);
        mk('rect', { x: cfg.x, y: cfg.y, width: cfg.w, height: cfg.h, rx: 2 }, g);
        txt(labelText, { x: cfg.x + 10, y: cfg.y + 13, class: 'dblock-label' }, g);
        return g;
    }

    // ── CONTROL UNIT ─────────────────────────────────────
    function drawCU() {
        var g = block(CU, 'CONTROL UNIT', 'dcu');

        function field(labelStr, valId, valStr, lx, bx, bw) {
            txt(labelStr, { x: lx, y: CU.y + 46, class: 'dfield-key' }, g);
            mk('rect', { x: bx, y: CU.y + 30, width: bw, height: 22, rx: 1, class: 'dfield-box' }, g);
            txt(valStr, { x: bx + bw / 2, y: CU.y + 46, id: valId,
                'text-anchor': 'middle', class: 'dfield-val' }, g);
        }

        field('IP',     'dcu-ip',     '0',    80,  110, 50);
        field('DECODE', 'dcu-op',     '\u2014', 220, 285, 130);
        field('STATUS', 'dcu-status', 'IDLE', 460, 530, 90);
    }

    // ── REGISTER FILE ────────────────────────────────────
    function drawRF() {
        var g = block(RF, 'REGISTER FILE', 'drf');
        REGS.forEach(function (r) {
            var rg = mk('g', { id: 'dreg-' + r.id, class: 'dreg-group' }, g);
            mk('rect', { x: r.bx, y: RF.y + 18, width: 120, height: 45, rx: 2, class: 'dreg-rect' }, rg);
            txt(r.label, { x: r.cx, y: RF.y + 33, 'text-anchor': 'middle', class: 'dreg-label' }, rg);
            txt('0',     { x: r.cx, y: RF.y + 53, 'text-anchor': 'middle',
                class: 'dreg-val', id: 'dreg-val-' + r.id }, rg);
        });
    }

    // ── BUSES ────────────────────────────────────────────
    function drawBuses() {
        var g = mk('g', { class: 'dbus-layer' }, svg);

        // Vertical lines: registers → horizontal bus
        REGS.forEach(function (r) {
            mk('line', { x1: r.cx, y1: RF.y + RF.h, x2: r.cx, y2: BUS_Y,
                class: 'dbus-vert', id: 'dbus-v' + r.id }, g);
        });

        // Horizontal data bus
        mk('line', { x1: REGS[0].cx, y1: BUS_Y, x2: REGS[3].cx, y2: BUS_Y,
            class: 'dbus-horiz', id: 'dbus-h' }, g);

        // Vertical drop from bus center to ALU
        mk('line', { x1: 360, y1: BUS_Y, x2: 360, y2: ALU.y,
            class: 'dbus-vert', id: 'dbus-drop' }, g);

        // Arrow triangles on bus
        mk('polygon', { points: '356,' + (BUS_Y - 8) + ' 364,' + (BUS_Y - 8) + ' 360,' + (BUS_Y - 2),
            class: 'dbus-arrow' }, g);
        mk('polygon', { points: '356,' + (ALU.y + 4) + ' 364,' + (ALU.y + 4) + ' 360,' + (ALU.y + 10),
            class: 'dbus-arrow' }, g);
    }

    // ── GATE SHAPES ──────────────────────────────────────
    function drawGate(gate) {
        var g   = mk('g', { id: 'dgate-' + gate.id, class: 'dgate' }, svg);
        var gx  = gate.x, gy = ALU.y + 28;
        var hw  = GH / 2;  // half height

        if (gate.sym === 'and') {
            mk('path', {
                d: 'M' + gx + ',' + gy +
                   ' L' + (gx + 28) + ',' + gy +
                   ' A' + hw + ',' + hw + ' 0 0,1 ' + (gx + 28) + ',' + (gy + GH) +
                   ' L' + gx + ',' + (gy + GH) + ' Z',
                class: 'dgate-shape'
            }, g);
            mk('line', { x1: gx - 10, y1: gy + 14, x2: gx, y2: gy + 14, class: 'dgate-wire' }, g);
            mk('line', { x1: gx - 10, y1: gy + 38, x2: gx, y2: gy + 38, class: 'dgate-wire' }, g);
            mk('line', { x1: gx + 28 + hw, y1: gy + hw, x2: gx + GW, y2: gy + hw, class: 'dgate-wire' }, g);

        } else if (gate.sym === 'or') {
            mk('path', {
                d: 'M' + gx + ',' + gy +
                   ' Q' + (gx + 10) + ',' + (gy + hw) + ' ' + gx + ',' + (gy + GH) +
                   ' L' + (gx + 28) + ',' + (gy + GH) +
                   ' Q' + (gx + 46) + ',' + (gy + hw) + ' ' + (gx + 28) + ',' + gy + ' Z',
                class: 'dgate-shape'
            }, g);
            mk('line', { x1: gx - 10, y1: gy + 14, x2: gx + 4, y2: gy + 14, class: 'dgate-wire' }, g);
            mk('line', { x1: gx - 10, y1: gy + 38, x2: gx + 4, y2: gy + 38, class: 'dgate-wire' }, g);
            mk('line', { x1: gx + 46, y1: gy + hw, x2: gx + GW, y2: gy + hw, class: 'dgate-wire' }, g);

        } else if (gate.sym === 'not') {
            mk('path', {
                d: 'M' + gx + ',' + gy +
                   ' L' + (gx + 36) + ',' + (gy + hw) +
                   ' L' + gx + ',' + (gy + GH) + ' Z',
                class: 'dgate-shape'
            }, g);
            mk('circle', { cx: gx + 41, cy: gy + hw, r: 5, class: 'dgate-shape dgate-bubble' }, g);
            mk('line', { x1: gx - 10, y1: gy + hw, x2: gx,       y2: gy + hw, class: 'dgate-wire' }, g);
            mk('line', { x1: gx + 46, y1: gy + hw, x2: gx + GW,  y2: gy + hw, class: 'dgate-wire' }, g);

        } else {
            // Arithmetic / ctrl: plain rectangle
            mk('rect', { x: gx, y: gy, width: GW - 4, height: GH, rx: 2, class: 'dgate-shape' }, g);
            txt(gate.op, { x: gx + (GW - 4) / 2, y: gy + 22,
                'text-anchor': 'middle', class: 'dgate-sym' }, g);
        }

        txt(gate.label, { x: gx + GW / 2 - 2, y: gy + GH + 14,
            'text-anchor': 'middle', class: 'dgate-label' }, g);

        // Second row labels
        var secondRowY = ALU.y + 28 + GH + 28;
        if (gate.id === 'AND') txt('f(A,B) = A\u00b7B',    { x: gx + 14, y: secondRowY + 12, class: 'dgate-desc' }, g);
        if (gate.id === 'OR')  txt('f(A,B) = A+B',         { x: gx + 14, y: secondRowY + 12, class: 'dgate-desc' }, g);
        if (gate.id === 'NOT') txt('f(A) = \u0100',         { x: gx + 10, y: secondRowY + 12, class: 'dgate-desc' }, g);
    }

    function drawALU() {
        block(ALU, 'ALU \u2014 ARITHMETIC & LOGIC UNIT', 'dalu');
        GATES.forEach(drawGate);
        // divider between arith and logic
        mk('line', { x1: 314, y1: ALU.y + 20, x2: 314, y2: ALU.y + ALU.h - 10,
            class: 'dgate-divider' }, svg);
        txt('ARITH', { x: 158, y: ALU.y + ALU.h - 8, 'text-anchor': 'middle', class: 'dalu-zone' }, svg);
        txt('LOGIC', { x: 440, y: ALU.y + ALU.h - 8, 'text-anchor': 'middle', class: 'dalu-zone' }, svg);
        txt('CTRL',  { x: 660, y: ALU.y + ALU.h - 8, 'text-anchor': 'middle', class: 'dalu-zone' }, svg);
    }

    // ── PUBLIC API ───────────────────────────────────────
    window.initDiagram = function () {
        var c = document.getElementById('diagram-container');
        if (!c) return;
        c.innerHTML = '';
        svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, id: 'cpu-svg', xmlns: NS }, c);
        addDefs();
        drawCU();
        drawRF();
        drawBuses();
        drawALU();
    };

    window.resetDiagram = function () {
        _setControl(0, '\u2014', 'IDLE', '');
        for (var i = 0; i < 4; i++) {
            var v = document.getElementById('dreg-val-' + i);
            if (v) v.textContent = '0';
        }
        _clearAll();
    };

    window.visualizeStep = function (instruction, mem, ipVal) {
        if (!svg || !instruction || !instruction[0]) return;
        var op = instruction[0].toUpperCase();
        _clearAll();
        _setControl(ipVal, op, 'RUN', 'dcpu-status-run');
        _updateRegs(mem);

        var src = [], dest = null;
        if (['ADD','SUB','MULT','DIV','AND','OR','BT','ST','EQUAL'].indexOf(op) >= 0) {
            dest = getMemoryIndex(instruction[1]);
            src  = [getMemoryIndex(instruction[2]), getMemoryIndex(instruction[3])];
        } else if (op === 'NOT') {
            dest = getMemoryIndex(instruction[1]);
            src  = [getMemoryIndex(instruction[1])];
        } else if (['READ','PRINT'].indexOf(op) >= 0) {
            src  = [getMemoryIndex(instruction[1])];
        } else if (op === 'WRITE') {
            dest = getMemoryIndex(instruction[1]);
        } else if (['MOVE','INPUT'].indexOf(op) >= 0) {
            dest = getMemoryIndex(instruction[1]);
            if (instruction[2]) src = [getMemoryIndex(instruction[2])];
        } else if (op === 'JUMP') {
            src  = [getMemoryIndex(instruction[1])];
        } else if (op === 'JUMPC') {
            src  = [getMemoryIndex(instruction[1])];
            if (instruction[2]) src.push(getMemoryIndex(instruction[2]));
        }

        src.forEach(function (i) {
            var e = document.getElementById('dreg-' + i);
            if (e) e.classList.add('dreg-src');
        });
        if (dest !== null && dest !== undefined) {
            var de = document.getElementById('dreg-' + dest);
            if (de) de.classList.add('dreg-dest');
        }

        var gateId = OP_GATE[op];
        if (gateId) {
            var ge = document.getElementById('dgate-' + gateId);
            if (ge) ge.classList.add('dgate-active');
            document.querySelectorAll('.dbus-vert,.dbus-horiz').forEach(function (b) {
                b.classList.add('dbus-active');
            });
            document.querySelectorAll('.dbus-arrow').forEach(function (a) {
                a.classList.add('dbus-arrow-active');
            });
        }
    };

    window.finalizeDiagram = function () {
        _clearAll();
        _setControl('\u2014', '\u2014', 'DONE', 'dcpu-status-done');
    };

    // ── PRIVATE HELPERS ──────────────────────────────────
    function _setControl(ip, op, status, cls) {
        var ipEl = document.getElementById('dcu-ip');
        var opEl = document.getElementById('dcu-op');
        var stEl = document.getElementById('dcu-status');
        if (ipEl) ipEl.textContent = ip;
        if (opEl) opEl.textContent = op;
        if (stEl) {
            stEl.textContent = status;
            stEl.setAttribute('class', 'dfield-val ' + (cls || ''));
        }
    }

    function _updateRegs(mem) {
        for (var i = 0; i < 4; i++) {
            var v = document.getElementById('dreg-val-' + i);
            if (v) v.textContent = mem[i];
        }
    }

    function _clearAll() {
        document.querySelectorAll('.dreg-group').forEach(function (e) {
            e.classList.remove('dreg-src', 'dreg-dest');
        });
        document.querySelectorAll('.dgate').forEach(function (e) {
            e.classList.remove('dgate-active');
        });
        document.querySelectorAll('.dbus-vert,.dbus-horiz').forEach(function (e) {
            e.classList.remove('dbus-active');
        });
        document.querySelectorAll('.dbus-arrow').forEach(function (a) {
            a.classList.remove('dbus-arrow-active');
        });
    }

    document.addEventListener('DOMContentLoaded', window.initDiagram);
})();
