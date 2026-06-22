const id = (x) => document.getElementById(x);
const cls = (x) => document.querySelectorAll("."+x);
document.body.innerHTML = '<p>Loading...</p>';

const preload = null;

(async () => {
    if (preload) {
        const swfData = await fetch(preload).then(r => r.arrayBuffer());
        startEditor(preload, swfData);
    }
    else {
        const loadFile = file => {
            const reader = new FileReader();
            reader.onload = (e) => {startEditor(file.name,e.target.result);};
            reader.readAsArrayBuffer(file);
        }
        document.body.innerHTML = `
            <div id="dropZone" class="drop-zone">
                <h1>Welcome</h1>
                <p>Drag and drop a SWF file (or click here to select a SWF file) here to start editing.</p>
                <input type="file" id="fileInput" accept=".swf" style="display: none;">
            </div>
        `;
        const fileInput = id('fileInput');
        const dropZone = id('dropZone');
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (event) => {if (event.target.files[0]) loadFile(event.target.files[0]);});
        dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropZone.children[0].innerText = 'Right here!';
            dropZone.children[1].innerText = 'Release the mouse to start editing.';
            dropZone.classList.add('dragging');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.children[0].innerText = 'Welcome';
            dropZone.children[1].innerText = 'Drag and drop a SWF file (or click here to select a SWF file) here to start editing.';
            dropZone.classList.remove('dragging');
        });
        dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropZone.children[0].innerText = 'Welcome';
            dropZone.children[1].innerText = 'Drag and drop a SWF file (or click here to select a SWF file) here to start editing.';
            dropZone.classList.remove('dragging');
            if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]);
        });
    }
})();