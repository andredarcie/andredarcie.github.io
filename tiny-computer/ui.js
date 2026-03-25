var tableBody    = document.getElementById('table-body');
var readOutput   = document.getElementById('read-output');
var errorPanel   = document.getElementById('error-panel');
var errorContent = document.getElementById('error-content');

async function myFunction() {
    memory = [0, 0, 0, 0];
    tableBody.innerHTML  = '';
    readOutput.innerHTML = '';

    var rawLines = document.getElementById('input-box').value.trim().split('\n');
    var memoryInstruction = read();
    var errors = validateProgram(memoryInstruction);

    if (errors.length > 0) {
        showErrors(errors, rawLines);
        return;
    }

    hideErrors();
    if (typeof resetDiagram === 'function') resetDiagram();

    var MAX_STEPS = 10000;
    var steps = 0;

    for (IP = 0; IP < memoryInstruction.length; IP++) {
        if (++steps > MAX_STEPS) {
            readOutput.textContent = 'ERROR: INFINITE LOOP DETECTED (>' + MAX_STEPS + ' STEPS)';
            break;
        }

        var instruction = memoryInstruction[IP];
        if (!instruction || instruction[0] === '') continue;

        var operation = instruction[0].toUpperCase();

        if (operation === 'INPUT') {
            var dest = getMemoryIndex(instruction[1]);
            memory[dest] = await waitForInput('INPUT → P' + dest);
            addRow(IP, memory[0], memory[1], memory[2], memory[3]);
        } else {
            runInstruction(instruction);
            if (operation !== 'JUMP' && operation !== 'JUMPC') {
                addRow(IP, memory[0], memory[1], memory[2], memory[3]);
            }
        }

        if (typeof visualizeStep === 'function')
            visualizeStep(instruction, memory, IP);
    }

    if (typeof finalizeDiagram === 'function') finalizeDiagram();
}

function showErrors(errors, rawLines) {
    var errorMap = {};
    errors.forEach(function(e) { errorMap[e.line] = e.message; });

    var count = errors.length;
    var html = '<div class="error-count">';
    html += '<span class="error-count-icon">✕</span> ';
    html += count + ' COMPILATION ERROR' + (count > 1 ? 'S' : '');
    html += '</div>';

    html += '<div class="code-listing">';
    rawLines.forEach(function(line, idx) {
        var lineNum = idx + 1;
        var hasError = errorMap[lineNum] !== undefined;

        if (hasError) {
            html += '<div class="code-line code-line-error">';
            html += '<span class="line-arrow">▶</span>';
            html += '<span class="line-num">' + lineNum + '</span>';
            html += '<span class="line-sep">│</span>';
            html += '<span class="line-code line-code-error">' + escapeHtml(line.toUpperCase()) + '</span>';
            html += '</div>';
            html += '<div class="error-msg-row">';
            html += '<span class="error-msg-indent">  └─ </span>';
            html += '<span class="error-msg-text">' + errorMap[lineNum] + '</span>';
            html += '</div>';
        } else {
            html += '<div class="code-line">';
            html += '<span class="line-arrow"> </span>';
            html += '<span class="line-num">' + lineNum + '</span>';
            html += '<span class="line-sep">│</span>';
            html += '<span class="line-code">' + escapeHtml(line.toUpperCase()) + '</span>';
            html += '</div>';
        }
    });
    html += '</div>';

    errorContent.innerHTML = html;
    errorPanel.style.display = 'block';
}

function hideErrors() {
    errorPanel.style.display = 'none';
    errorContent.innerHTML   = '';
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function read() {
    var inputBox = document.getElementById('input-box');
    var ops = VALID_OPERATIONS.join('|');
    var lines = inputBox.value
        .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .replace(/[^\x20-\x7E\n]/g, '')
        .replace(new RegExp('(\\S)[ \t]+(' + ops + ')(?=[ \t]|$)', 'gi'), '$1\n$2')
        .split('\n');

    var instructions = [];
    for (var i = 0; i < lines.length; i++) {
        var clean = lines[i].trim();
        instructions.push(clean === '' ? [''] : clean.split(/\s+/));
    }
    return instructions;
}

function addRow(ip, p0, p1, p2, p3) {
    var row = tableBody.insertRow(-1);
    [ip, p0, p1, p2, p3].forEach(function(val) {
        var cell = row.insertCell(-1);
        cell.appendChild(document.createTextNode(val));
    });
}
