function runInstruction(instructions) {
    var operation = instructions[0].toUpperCase();

    if (operation === 'ADD' || operation === 'SUB' || operation === 'MULT' || operation === 'DIV') {
        arithmeticOperations(instructions);
        return;
    }
    if (operation === 'AND' || operation === 'OR' || operation === 'NOT' ||
        operation === 'BT'  || operation === 'ST' || operation === 'EQUAL') {
        logicOperations(instructions);
        return;
    }
    if (operation === 'JUMP' || operation === 'JUMPC') {
        controlFlowOperations(instructions);
        return;
    }
    dataHandlingAndMemoryOperations(instructions);
}
