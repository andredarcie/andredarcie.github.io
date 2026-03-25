function stackOperations(instructions) {
    var op = instructions[0].toUpperCase();

    if (op === 'NOP') {
        // no operation
    } else if (op === 'PUSH') {
        var idx = getMemoryIndex(instructions[1]);
        stack.push(memory[idx]);
    } else if (op === 'POP') {
        var idx = getMemoryIndex(instructions[1]);
        memory[idx] = stack.length > 0 ? stack.pop() : 0;
    } else if (op === 'CALL') {
        stack.push(IP + 1);
        IP = Number(instructions[1]) - 1;
    } else if (op === 'RET') {
        if (stack.length > 0) IP = stack.pop() - 1;
    }
}
