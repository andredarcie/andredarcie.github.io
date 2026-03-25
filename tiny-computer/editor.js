var AUTOCOMPLETE_WORDS = [
    { word: 'WRITE',  hint: '[MP] [V]'      },
    { word: 'READ',   hint: '[MP]'           },
    { word: 'PRINT',  hint: '[MP]'           },
    { word: 'INPUT',  hint: '[MP]'           },
    { word: 'MOVE',   hint: '[MP] [MP]'      },
    { word: 'ADD',    hint: '[MP] [MP] [MP]' },
    { word: 'SUB',    hint: '[MP] [MP] [MP]' },
    { word: 'MULT',   hint: '[MP] [MP] [MP]' },
    { word: 'DIV',    hint: '[MP] [MP] [MP]' },
    { word: 'AND',    hint: '[MP] [MP] [MP]' },
    { word: 'OR',     hint: '[MP] [MP] [MP]' },
    { word: 'NOT',    hint: '[MP]'           },
    { word: 'BT',     hint: '[MP] [MP] [MP]' },
    { word: 'ST',     hint: '[MP] [MP] [MP]' },
    { word: 'EQUAL',  hint: '[MP] [MP] [MP]' },
    { word: 'JUMP',   hint: '[MP]'           },
    { word: 'JUMPC',  hint: '[MP] [MP]'      }
];

var LINE_HEIGHT       = 26; // must match CSS line-height
var EDITOR_PAD_TOP    = 8;  // must match CSS padding-top
var acSelected        = -1;
var acVisible         = false;

// ── LINE NUMBERS ──────────────────────────────────────────

function updateLineNumbers() {
    var textarea    = document.getElementById('input-box');
    var lineNumbers = document.getElementById('line-numbers');
    var count       = textarea.value === '' ? 1 : textarea.value.split('\n').length;
    var html        = '';
    for (var i = 1; i <= count; i++) {
        html += '<span>' + i + '</span>';
    }
    lineNumbers.innerHTML = html;
}

function syncScroll() {
    var textarea    = document.getElementById('input-box');
    var lineNumbers = document.getElementById('line-numbers');
    lineNumbers.scrollTop = textarea.scrollTop;
}

// ── AUTOCOMPLETE ──────────────────────────────────────────

var REGISTERS = [
    { word: 'P0', hint: 'register' },
    { word: 'P1', hint: 'register' },
    { word: 'P2', hint: 'register' },
    { word: 'P3', hint: 'register' }
];

function getTokenContext() {
    var textarea = document.getElementById('input-box');
    var pos      = textarea.selectionStart;
    var before   = textarea.value.substring(0, pos);
    var lines    = before.split('\n');
    var line     = lines[lines.length - 1];

    // Current word fragment at cursor
    var match = line.match(/([A-Za-z0-9]+)$/);
    if (!match) return null;

    var token       = match[1];
    // First token = nothing but optional whitespace before it
    var isFirstToken = line.replace(/\s*[A-Za-z0-9]+$/, '').trim() === '';

    return { token: token, isFirstToken: isFirstToken };
}

function getCaretLineIndex() {
    var textarea = document.getElementById('input-box');
    var pos      = textarea.selectionStart;
    return textarea.value.substring(0, pos).split('\n').length - 1;
}

function showAutocomplete(matches) {
    var dropdown = document.getElementById('ac-dropdown');
    var textarea = document.getElementById('input-box');

    if (matches.length === 0) { hideAutocomplete(); return; }

    var lineIdx = getCaretLineIndex();
    var top     = EDITOR_PAD_TOP + (lineIdx + 1) * LINE_HEIGHT - textarea.scrollTop;

    dropdown.style.top     = top + 'px';
    dropdown.style.display = 'block';
    acVisible  = true;
    acSelected = -1;

    dropdown.innerHTML = matches.map(function(m, i) {
        return '<div class="ac-item" data-word="' + m.word + '" data-idx="' + i + '">' +
               '<span class="ac-word">' + m.word + '</span>' +
               '<span class="ac-hint">' + m.hint + '</span>' +
               '</div>';
    }).join('');

    dropdown.querySelectorAll('.ac-item').forEach(function(item) {
        item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            completeWith(item.getAttribute('data-word'));
        });
    });
}

function hideAutocomplete() {
    document.getElementById('ac-dropdown').style.display = 'none';
    acVisible  = false;
    acSelected = -1;
}

function setActiveItem(idx) {
    var items = document.querySelectorAll('.ac-item');
    items.forEach(function(el) { el.classList.remove('ac-active'); });
    if (idx >= 0 && idx < items.length) {
        items[idx].classList.add('ac-active');
        acSelected = idx;
    }
}

function completeWith(word) {
    var textarea  = document.getElementById('input-box');
    var pos       = textarea.selectionStart;
    var before    = textarea.value.substring(0, pos);
    var after     = textarea.value.substring(pos);
    // Replace the current token fragment (whatever was being typed)
    var newBefore = before.replace(/([A-Za-z0-9]+)$/, word);
    textarea.value = newBefore + ' ' + after.replace(/^[^\S\n]*/, '');
    textarea.selectionStart = textarea.selectionEnd = newBefore.length + 1;
    hideAutocomplete();
    updateLineNumbers();
    textarea.focus();
}

// ── EVENT HANDLERS ────────────────────────────────────────

function onKeydown(e) {
    if (!acVisible) return;
    var items = document.querySelectorAll('.ac-item');

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveItem(Math.min(acSelected + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveItem(Math.max(acSelected - 1, 0));
    } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        var target = acSelected >= 0 ? items[acSelected] : items[0];
        if (target) completeWith(target.getAttribute('data-word'));
    } else if (e.key === 'Escape') {
        e.preventDefault();
        hideAutocomplete();
    }
}

function onInput() {
    updateLineNumbers();
    syncScroll();

    var ctx = getTokenContext();
    if (!ctx) { hideAutocomplete(); return; }

    var upper = ctx.token.toUpperCase();

    if (ctx.isFirstToken) {
        // Suggest instructions
        var matches = AUTOCOMPLETE_WORDS.filter(function(m) {
            return m.word.indexOf(upper) === 0 && m.word !== upper;
        });
        showAutocomplete(matches);
    } else if (upper.charAt(0) === 'P') {
        // Suggest registers
        var regMatches = REGISTERS.filter(function(r) {
            return r.word.indexOf(upper) === 0 && r.word !== upper;
        });
        showAutocomplete(regMatches);
    } else {
        hideAutocomplete();
    }
}

// ── PASTE NORMALIZATION ───────────────────────────────────

function normalizePaste(text) {
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Remove non-printable characters (keep \n)
    text = text.replace(/[^\x20-\x7E\n]/g, '');
    // Insert \n before any instruction keyword that appears mid-line
    // (preceded by a non-whitespace char and one or more spaces)
    var ops = VALID_OPERATIONS.join('|');
    var re  = new RegExp('(\\S)[ \t]+(' + ops + ')(?=[ \t]|$)', 'gi');
    text = text.replace(re, '$1\n$2');
    // Trim each line
    return text.split('\n').map(function(l) { return l.trim(); }).join('\n');
}

// ── INIT ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    var textarea = document.getElementById('input-box');
    updateLineNumbers();

    textarea.addEventListener('paste', function(e) {
        e.preventDefault();
        var pasted     = (e.clipboardData || window.clipboardData).getData('text/plain');
        var normalized = normalizePaste(pasted);
        var start      = textarea.selectionStart;
        var end        = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + normalized + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + normalized.length;
        updateLineNumbers();
    });

    textarea.addEventListener('input',   onInput);
    textarea.addEventListener('keydown', onKeydown);
    textarea.addEventListener('scroll',  function() { syncScroll(); if (acVisible) hideAutocomplete(); });
    textarea.addEventListener('click',   hideAutocomplete);

    document.addEventListener('click', function(e) {
        if (!e.target.closest('#editor-wrap')) hideAutocomplete();
    });
});
