function logicOperations(instructions) {
    var op   = instructions[0].toUpperCase();
    var dest = getMemoryIndex(instructions[1]);
    var a    = getValueFromMemoryPosition(op === 'NOT' ? instructions[1] : instructions[2]);
    var b    = (op !== 'NOT') ? getValueFromMemoryPosition(instructions[3]) : undefined;

    if (op === 'AND')   memory[dest] = a && b;
    if (op === 'OR')    memory[dest] = a || b;
    if (op === 'NOT')   memory[dest] = !a;
    if (op === 'BT')    memory[dest] = a > b;
    if (op === 'ST')    memory[dest] = a < b;
    if (op === 'EQUAL') memory[dest] = a == b;
}
