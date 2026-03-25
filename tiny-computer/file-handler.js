function exportCode() {
    var textarea = document.getElementById('input-box');
    var code     = textarea.value.trim();

    if (!code) {
        showFileMessage('NOTHING TO EXPORT', 'error');
        return;
    }

    var blob     = new Blob([code], { type: 'text/plain' });
    var url      = URL.createObjectURL(blob);
    var filename = 'program.tiny';

    var a  = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showFileMessage('EXPORTED: ' + filename, 'ok');
}

function importCode() {
    var fileInput = document.getElementById('file-import-input');
    fileInput.value = '';
    fileInput.click();
}

function onFileSelected(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.tiny')) {
        showFileMessage('INVALID FILE TYPE — USE .TINY', 'error');
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        var code     = e.target.result;
        var textarea = document.getElementById('input-box');
        textarea.value = code;
        updateLineNumbers();
        showFileMessage('LOADED: ' + file.name, 'ok');
    };
    reader.onerror = function() {
        showFileMessage('ERROR READING FILE', 'error');
    };
    reader.readAsText(file);
}

function showFileMessage(msg, type) {
    var el = document.getElementById('file-message');
    el.textContent = msg;
    el.className   = 'file-message file-message-' + type;
    el.style.display = 'block';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function() {
        el.style.display = 'none';
    }, 2500);
}
