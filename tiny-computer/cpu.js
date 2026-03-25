function runInstruction(instructions) {
    var operation = instructions[0].toUpperCase();

    if (operation === 'ADD'  || operation === 'SUB'  || operation === 'MULT' || operation === 'DIV' ||
        operation === 'INC'  || operation === 'DEC'  || operation === 'SHL'  || operation === 'SHR') {
        arithmeticOperations(instructions);
        return;
    }
    if (operation === 'AND' || operation === 'OR'  || operation === 'NOT' ||
        operation === 'BT'  || operation === 'ST'  || operation === 'EQUAL' || operation === 'XOR') {
        logicOperations(instructions);
        return;
    }
    if (operation === 'JUMP' || operation === 'JUMPC') {
        controlFlowOperations(instructions);
        return;
    }
    if (operation === 'PUSH' || operation === 'POP' ||
        operation === 'CALL' || operation === 'RET' || operation === 'NOP') {
        stackOperations(instructions);
        return;
    }
    dataHandlingAndMemoryOperations(instructions);
}
