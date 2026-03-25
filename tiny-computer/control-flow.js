function controlFlowOperations(instructions) {
    var op = instructions[0].toUpperCase();

    if (op === 'JUMP') {
        IP = getValueFromMemoryPosition(instructions[1]) - 1;
    } else if (op === 'JUMPC') {
        var cond = getValueFromMemoryPosition(instructions[1]);
        if (cond && cond !== 'FALSE' && cond !== 0) {
            IP = getValueFromMemoryPosition(instructions[2]) - 1;
        }
    }
}
