function waitForInput(register) {
    return new Promise(function(resolve) {
        var modal      = document.getElementById('input-modal');
        var label      = document.getElementById('input-label');
        var field      = document.getElementById('input-field');
        var confirmBtn = document.getElementById('input-confirm');

        label.textContent = register.toUpperCase();
        field.value = '';
        modal.style.display = 'flex';
        setTimeout(function() { field.focus(); }, 50);

        function submit() {
            var raw = field.value.trim();
            modal.style.display = 'none';
            field.removeEventListener('keydown', onKey);
            confirmBtn.removeEventListener('click', submit);
            resolve(parseInputValue(raw));
        }

        function onKey(e) {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
        }

        field.addEventListener('keydown', onKey);
        confirmBtn.addEventListener('click', submit);
    });
}

function parseInputValue(raw) {
    if (raw.toUpperCase() === 'TRUE')              return true;
    if (raw.toUpperCase() === 'FALSE')             return false;
    if (raw !== '' && !isNaN(Number(raw)))         return Number(raw);
    return raw;
}
