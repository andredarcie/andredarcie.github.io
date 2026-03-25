var memory = [0, 0, 0, 0];
var IP = 0;
var stack = [];

function getMemoryIndex(param) {
    return parseInt(param.toUpperCase().replace('P', ''));
}

function getValueFromMemoryPosition(param) {
    return memory[getMemoryIndex(param)];
}
