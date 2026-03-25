function arithmeticOperations(instructions) {
    var op   = instructions[0].toUpperCase();
    var dest = getMemoryIndex(instructions[1]);
    var a    = instructions[2] ? Number(getValueFromMemoryPosition(instructions[2])) : undefined;
    var b    = instructions[3] ? Number(getValueFromMemoryPosition(instructions[3])) : undefined;

    if (op === 'ADD')  memory[dest] = a + b;
    if (op === 'SUB')  memory[dest] = a - b;
    if (op === 'MULT') memory[dest] = a * b;
    if (op === 'DIV')  memory[dest] = a / b;
    if (op === 'INC')  memory[dest] = memory[dest] + 1;
    if (op === 'DEC')  memory[dest] = memory[dest] - 1;
    if (op === 'SHL')  memory[dest] = Number(getValueFromMemoryPosition(instructions[2])) << 1;
    if (op === 'SHR')  memory[dest] = Number(getValueFromMemoryPosition(instructions[2])) >> 1;
}
