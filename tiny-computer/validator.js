var VALID_OPERATIONS = [
    'READ', 'PRINT', 'WRITE', 'MOVE', 'INPUT',
    'ADD', 'SUB', 'MULT', 'DIV', 'INC', 'DEC', 'SHL', 'SHR',
    'AND', 'OR', 'NOT', 'BT', 'ST', 'EQUAL', 'XOR',
    'JUMP', 'JUMPC',
    'PUSH', 'POP', 'CALL', 'RET', 'NOP'
];

// Expected total token count (operation + params)
var PARAM_COUNT = {
    'READ':  2, 'PRINT': 2, 'NOT': 2, 'JUMP': 2, 'INPUT': 2,
    'INC':   2, 'DEC':   2, 'PUSH': 2, 'POP': 2,
    'WRITE': 3, 'MOVE':  3, 'JUMPC': 3, 'SHL': 3, 'SHR': 3,
    'ADD':   4, 'SUB':   4, 'MULT':  4, 'DIV':   4,
    'AND':   4, 'OR':    4, 'BT':    4, 'ST':    4, 'EQUAL': 4, 'XOR': 4,
    'CALL':  2, 'RET':   1, 'NOP':   1
};

// Operations with no memory position params
var NO_PARAM_OPS = ['NOP', 'RET'];
// Operations whose first param is a value, not a memory position
var VALUE_PARAM_OPS = ['CALL'];

var VALID_MEMORY_POSITIONS = ['P0', 'P1', 'P2', 'P3'];

function isValidMemoryPosition(param) {
    if (!param) return false;
    return VALID_MEMORY_POSITIONS.indexOf(param.toUpperCase()) !== -1;
}

function isValidValue(val) {
    if (!val) return false;
    if (val.toUpperCase() === 'TRUE' || val.toUpperCase() === 'FALSE') return true;
    if (val.charAt(0) === '"') return true;
    return !isNaN(Number(val));
}

function validateProgram(instructions) {
    var errors = [];

    for (var i = 0; i < instructions.length; i++) {
        var tokens = instructions[i];
        if (!tokens || tokens[0] === '') continue;

        var op = tokens[0].toUpperCase();
        var lineNum = i + 1;

        if (VALID_OPERATIONS.indexOf(op) === -1) {
            errors.push({ line: lineNum, message: 'UNKNOWN INSTRUCTION: "' + tokens[0].toUpperCase() + '"' });
            continue;
        }

        // Detect a second instruction keyword anywhere after the first token
        for (var k = 1; k < tokens.length; k++) {
            if (VALID_OPERATIONS.indexOf(tokens[k].toUpperCase()) !== -1) {
                errors.push({ line: lineNum, message: 'ONLY ONE INSTRUCTION PER LINE' });
                break;
            }
        }
        if (errors.length && errors[errors.length - 1].line === lineNum) continue;

        var expected = PARAM_COUNT[op];
        if (tokens.length !== expected) {
            var got = tokens.length - 1;
            var exp = expected - 1;
            errors.push({ line: lineNum, message: op + ' EXPECTS ' + exp + ' PARAM' + (exp !== 1 ? 'S' : '') + ', GOT ' + got });
            continue;
        }

        // Operations with no params
        if (NO_PARAM_OPS.indexOf(op) !== -1) continue;

        // CALL: first param is a line number value
        if (VALUE_PARAM_OPS.indexOf(op) !== -1) {
            if (!isValidValue(tokens[1])) {
                errors.push({ line: lineNum, message: 'INVALID LINE NUMBER: "' + tokens[1] + '"' });
            }
            continue;
        }

        // First param is always dest memory position
        if (!isValidMemoryPosition(tokens[1])) {
            errors.push({ line: lineNum, message: 'INVALID MEMORY POSITION: "' + tokens[1].toUpperCase() + '"' });
            continue;
        }

        // WRITE: second param is a value
        if (op === 'WRITE') {
            if (!isValidValue(tokens[2])) {
                errors.push({ line: lineNum, message: 'INVALID VALUE: "' + tokens[2] + '"' });
            }
            continue;
        }

        // All remaining params must be memory positions
        for (var j = 2; j < tokens.length; j++) {
            if (!isValidMemoryPosition(tokens[j])) {
                errors.push({ line: lineNum, message: 'INVALID MEMORY POSITION: "' + tokens[j].toUpperCase() + '"' });
                break;
            }
        }
    }

    return errors;
}
