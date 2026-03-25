function dataHandlingAndMemoryOperations(instructions) {
    var op   = instructions[0].toUpperCase();
    var dest = getMemoryIndex(instructions[1]);

    if (op === 'READ' || op === 'PRINT') {
        document.getElementById('read-output').textContent = 'OUTPUT: ' + memory[dest];
    } else if (op === 'WRITE') {
        var val = instructions[2];
        if (val.toUpperCase() === 'TRUE')       memory[dest] = true;
        else if (val.toUpperCase() === 'FALSE') memory[dest] = false;
        else if (val.indexOf('"') >= 0)         memory[dest] = val.split('"').join('');
        else                                    memory[dest] = Number(val);
    } else if (op === 'MOVE') {
        memory[dest] = getValueFromMemoryPosition(instructions[2]);
    }
}
