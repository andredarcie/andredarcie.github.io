var dbState = {
    active:       false,
    ip:           0,
    instructions: [],
    history:      []   // [{ip, memory, rowCount, output, instruction}]
};

// ── START / STOP ─────────────────────────────────────────

function startDebug() {
    var rawLines          = document.getElementById('input-box').value.trim().split('\n');
    var memoryInstruction = read();
    var errors            = validateProgram(memoryInstruction);

    if (errors.length > 0) { showErrors(errors, rawLines); return; }
    hideErrors();

    memory = [0, 0, 0, 0];
    document.getElementById('table-body').innerHTML    = '';
    document.getElementById('read-output').textContent = '';

    dbState.active       = true;
    dbState.ip           = 0;
    dbState.instructions = memoryInstruction;
    dbState.history      = [];

    // Skip leading empty lines
    while (dbState.ip < dbState.instructions.length &&
           (!dbState.instructions[dbState.ip] || dbState.instructions[dbState.ip][0] === '')) {
        dbState.ip++;
    }

    if (typeof resetDiagram === 'function') resetDiagram();
    _dbShowControls(true);
    _dbHighlightLine(dbState.ip);
    _dbUpdateButtons();
    _dbUpdateInfo();
}

function stopDebug() {
    dbState.active  = false;
    dbState.history = [];
    _dbShowControls(false);
    _dbHighlightLine(-1);
    if (typeof resetDiagram === 'function') resetDiagram();
}

// ── STEP FORWARD ─────────────────────────────────────────

window.stepForward = async function () {
    if (!dbState.active) return;

    var instr = dbState.instructions[dbState.ip];
    if (!instr || dbState.ip >= dbState.instructions.length) {
        _dbFinish(); return;
    }

    var operation = instr[0].toUpperCase();

    // Save snapshot before execution
    dbState.history.push({
        ip:          dbState.ip,
        memory:      memory.slice(),
        rowCount:    document.getElementById('table-body').rows.length,
        output:      document.getElementById('read-output').textContent,
        instruction: instr
    });

    // Execute
    IP = dbState.ip;

    if (operation === 'INPUT') {
        var dest  = getMemoryIndex(instr[1]);
        memory[dest] = await waitForInput('INPUT \u2192 P' + dest);
        addRow(IP, memory[0], memory[1], memory[2], memory[3]);
    } else {
        runInstruction(instr);
        if (operation !== 'JUMP' && operation !== 'JUMPC') {
            addRow(IP, memory[0], memory[1], memory[2], memory[3]);
        }
    }

    if (typeof visualizeStep === 'function') visualizeStep(instr, memory, IP);

    // Advance IP (mirrors the for-loop +1)
    dbState.ip = IP + 1;

    // Skip empty lines
    while (dbState.ip < dbState.instructions.length &&
           (!dbState.instructions[dbState.ip] || dbState.instructions[dbState.ip][0] === '')) {
        dbState.ip++;
    }

    if (dbState.ip >= dbState.instructions.length) {
        _dbFinish();
    } else {
        _dbHighlightLine(dbState.ip);
        _dbUpdateButtons();
        _dbUpdateInfo();
    }
};

// ── STEP BACK ────────────────────────────────────────────

window.stepBack = function () {
    if (!dbState.active || dbState.history.length === 0) return;

    var snap = dbState.history.pop();

    // Restore state
    memory     = snap.memory.slice();
    dbState.ip = snap.ip;

    // Restore memory log rows
    var tbody = document.getElementById('table-body');
    while (tbody.rows.length > snap.rowCount) tbody.deleteRow(-1);

    // Restore output
    document.getElementById('read-output').textContent = snap.output;

    // Restore diagram to previous state
    if (dbState.history.length > 0) {
        var prev = dbState.history[dbState.history.length - 1];
        if (typeof visualizeStep === 'function')
            visualizeStep(prev.instruction, memory, prev.ip);
    } else {
        if (typeof resetDiagram === 'function') resetDiagram();
    }

    _dbHighlightLine(dbState.ip);
    _dbUpdateButtons();
    _dbUpdateInfo();
};

// ── PRIVATE HELPERS ──────────────────────────────────────

function _dbFinish() {
    _dbHighlightLine(-1);
    if (typeof finalizeDiagram === 'function') finalizeDiagram();
    _dbShowControls(false);
    dbState.active  = false;
    dbState.history = [];
    document.getElementById('debug-info').textContent = '';
}

function _dbShowControls(debugActive) {
    document.getElementById('run-bar').style.display   = debugActive ? 'none'  : 'flex';
    document.getElementById('debug-bar').style.display = debugActive ? 'flex'  : 'none';
}

function _dbHighlightLine(lineIndex) {
    var lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers) return;
    lineNumbers.querySelectorAll('span').forEach(function (s, i) {
        s.classList.toggle('line-current', i === lineIndex);
    });

    // Scroll textarea to keep current line visible
    if (lineIndex >= 0) {
        var textarea = document.getElementById('input-box');
        var targetTop = lineIndex * 26; // LINE_HEIGHT
        if (targetTop < textarea.scrollTop || targetTop > textarea.scrollTop + textarea.clientHeight - 26) {
            textarea.scrollTop = Math.max(0, targetTop - 52);
            var lineNumbers2 = document.getElementById('line-numbers');
            if (lineNumbers2) lineNumbers2.scrollTop = textarea.scrollTop;
        }
    }
}

function _dbUpdateButtons() {
    var backBtn = document.getElementById('debug-back');
    if (backBtn) backBtn.disabled = dbState.history.length === 0;

    var nextBtn = document.getElementById('debug-next');
    if (nextBtn) nextBtn.disabled = dbState.ip >= dbState.instructions.length;
}

function _dbUpdateInfo() {
    var el  = document.getElementById('debug-info');
    if (!el) return;
    var instr = dbState.instructions[dbState.ip];
    var label = instr && instr[0] ? instr[0].toUpperCase() : '—';
    el.textContent = 'LINE ' + (dbState.ip + 1) + '  \u2192  ' + label;
}
