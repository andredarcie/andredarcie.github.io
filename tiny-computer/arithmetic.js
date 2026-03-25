function arithmeticOperations(instructions) {
    var op   = instructions[0].toUpperCase();
    var dest = getMemoryIndex(instructions[1]);
    var a    = Number(getValueFromMemoryPosition(instructions[2]));
    var b    = Number(getValueFromMemoryPosition(instructions[3]));

    if (op === 'ADD')  memory[dest] = a + b;
    if (op === 'SUB')  memory[dest] = a - b;
    if (op === 'MULT') memory[dest] = a * b;
    if (op === 'DIV')  memory[dest] = a / b;
}
