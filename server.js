const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const app = express();
const port = 3000;

// Config
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage Engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: storage });

// Global State for "Running Process"
let runningProcess = null;
let logBuffer = [];

function addToLog(data) {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            logBuffer.push(`[${new Date().toLocaleTimeString()}] ${line}`);
            if (logBuffer.length > 500) logBuffer.shift(); // Keep last 500 lines
        }
    });
}

// Routes
app.use('/files', express.static('uploads'));

// API: File Manager
app.get('/api/files', (req, res) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    fs.readdir(dir, (err, files) => {
        if (err) return res.json([]);
        const fileData = files.map(f => {
            const stats = fs.statSync(path.join(dir, f));
            return { name: f, size: (stats.size / 1024).toFixed(1) + ' KB', isFile: stats.isFile() };
        });
        res.json(fileData);
    });
});

app.post('/api/delete', (req, res) => {
    try {
        fs.unlinkSync(path.join('./uploads', req.body.filename));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/read', (req, res) => {
    try {
        const content = fs.readFileSync(path.join('./uploads', req.body.filename), 'utf8');
        res.json({ content });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/save', (req, res) => {
    try {
        fs.writeFileSync(path.join('./uploads', req.body.filename), req.body.content);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/upload', upload.single('file'), (req, res) => res.json({ success: true }));

// API: Terminal & Process
app.post('/api/run', (req, res) => {
    const { command } = req.body;

    if (runningProcess) {
        return res.json({ success: false, message: 'A process is already running. Stop it first.' });
    }

    addToLog(`> Starting: ${command}`);
    const args = command.split(' ');
    const cmd = args.shift();

    try {
        runningProcess = spawn(cmd, args, { cwd: './uploads', shell: true });

        runningProcess.stdout.on('data', addToLog);
        runningProcess.stderr.on('data', addToLog);

        runningProcess.on('close', (code) => {
            addToLog(`> Process exited with code ${code}`);
            runningProcess = null;
        });

        res.json({ success: true, message: 'Process started' });
    } catch (e) {
        addToLog(`> Error starting: ${e.message}`);
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/stop', (req, res) => {
    if (runningProcess) {
        runningProcess.kill();
        runningProcess = null;
        addToLog('> Process stopped by user.');
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'No process running' });
    }
});

app.get('/api/logs', (req, res) => res.json(logBuffer));

// Main UI
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>⚡ Ultimate Pocket Hosting</title>
        <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
        <style>
            :root { --bg: #0f172a; --panel: #1e293b; --primary: #3b82f6; --text: #f8fafc; --success: #22c55e; --danger: #ef4444; }
            * { box-sizing: border-box; }
            body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; height: 100vh; display: flex; flex-direction: column; }
            
            .navbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: var(--panel); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .logo { font-size: 1.5rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 10px; }
            
            .main-grid { display: grid; grid-template-columns: 350px 1fr; gap: 20px; flex: 1; min-height: 0; }
            
            .panel { background: var(--panel); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; overflow: hidden; }
            h2 { margin: 0 0 15px 0; font-size: 1.1rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; }
            
            /* File Manager */
            .file-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
            .file-item { display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; transition: 0.2s; }
            .file-item:hover { background: rgba(255,255,255,0.1); }
            .file-name { flex: 1; margin: 0 10px; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
            .file-actions i { padding: 5px; cursor: pointer; color: #94a3b8; transition: 0.2s; }
            .file-actions i:hover { color: var(--text); }
            
            /* Terminal */
            .terminal { background: #000; color: #10b981; font-family: 'Courier New', monospace; flex: 1; border-radius: 8px; padding: 15px; overflow-y: auto; font-size: 0.9rem; margin-bottom: 15px; border: 1px solid #334155; }
            .controls { display: flex; gap: 10px; }
            input[type="text"] { flex: 1; background: #0f172a; border: 1px solid #334155; color: white; padding: 10px; border-radius: 6px; font-family: monospace; }
            button { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.2s; }
            button:hover { filter: brightness(110%); }
            button.red { background: var(--danger); }
            
            /* Editor Modal */
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; }
            .modal-content { background: var(--panel); width: 80%; height: 80%; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; }
            textarea { flex: 1; background: #0f172a; color: #e2e8f0; border: none; padding: 15px; font-family: monospace; border-radius: 8px; resize: none; margin: 15px 0; }
            
            /* Upload */
            .drop-zone { border: 2px dashed #475569; padding: 20px; text-align: center; border-radius: 8px; color: #94a3b8; cursor: pointer; transition: 0.2s; margin-bottom: 20px; }
            .drop-zone:hover { border-color: var(--primary); color: var(--primary); }
        </style>
    </head>
    <body>
        <div class="navbar">
            <div class="logo"><i class="ri-server-fill"></i> Pocket Hosting V2</div>
            <div style="font-size: 0.9rem; color: #94a3b8;">Running on Port ${port}</div>
        </div>

        <div class="main-grid">
            <!-- Left: Files -->
            <div class="panel">
                <h2>File Manager</h2>
                <div class="drop-zone" onclick="document.getElementById('fileInput').click()">
                    <i class="ri-upload-cloud-2-line" style="font-size: 1.5rem;"></i><br>Click to Upload
                </div>
                <input type="file" id="fileInput" hidden multiple onchange="uploadFiles(this.files)">
                <div class="file-list" id="fileList">Loading...</div>
            </div>

            <!-- Right: Terminal & Editor -->
            <div class="panel">
                <h2>Console / Run</h2>
                <div class="terminal" id="terminalLog">Welcome to Pocket Hosting Terminal...</div>
                <div class="controls">
                    <input type="text" id="cmdInput" placeholder="Enter command (e.g., node bot.js)" onkeypress="if(event.key==='Enter') runCommand()">
                    <button onclick="runCommand()"><i class="ri-play-fill"></i> Run</button>
                    <button class="red" onclick="stopProcess()"><i class="ri-stop-fill"></i> Stop</button>
                </div>
            </div>
        </div>

        <!-- Editor Modal -->
        <div class="modal" id="editorModal">
            <div class="modal-content">
                <h2 id="editingFileName">Editing... <i class="ri-close-line" style="cursor:pointer" onclick="closeEditor()"></i></h2>
                <textarea id="fileContent"></textarea>
                <div style="text-align: right;">
                    <button onclick="saveFile()">Save Changes</button>
                </div>
            </div>
        </div>

        <script>
            // --- Logic ---
            const $ = id => document.getElementById(id);
            let currentFile = '';
            
            async function loadFiles() {
                const res = await fetch('/api/files');
                const files = await res.json();
                $('fileList').innerHTML = files.map(f => \`
                    <div class="file-item">
                        <i class="\${f.isFile ? 'ri-file-text-line' : 'ri-folder-line'}" style="color: #64748b;"></i>
                        <span class="file-name" onclick="editFile('\${f.name}')">\${f.name}</span>
                        <div class="file-actions">
                            <i class="ri-delete-bin-line" onclick="deleteFile('\${f.name}')"></i>
                        </div>
                    </div>
                \`).join('');
            }

            async function uploadFiles(files) {
                const formData = new FormData();
                formData.append('file', files[0]);
                await fetch('/upload', { method: 'POST', body: formData });
                loadFiles();
            }

            async function deleteFile(filename) {
                if(!confirm('Delete ' + filename + '?')) return;
                await fetch('/api/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({filename}) });
                loadFiles();
            }

            async function editFile(filename) {
                currentFile = filename;
                const res = await fetch('/api/read', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({filename}) });
                const data = await res.json();
                $('editingFileName').innerText = 'Editing: ' + filename;
                $('fileContent').value = data.content;
                $('editorModal').style.display = 'flex';
            }

            async function saveFile() {
                await fetch('/api/save', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({filename: currentFile, content: $('fileContent').value}) });
                closeEditor();
            }

            function closeEditor() { $('editorModal').style.display = 'none'; }

            async function runCommand() {
                const command = $('cmdInput').value;
                if(!command) return;
                await fetch('/api/run', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({command}) });
                $('cmdInput').value = '';
            }

            async function stopProcess() {
                await fetch('/api/stop', { method: 'POST' });
            }

            // Real-time Logs
            setInterval(async () => {
                const res = await fetch('/api/logs');
                const logs = await res.json();
                const term = $('terminalLog');
                term.innerText = logs.join('\\n');
                term.scrollTop = term.scrollHeight;
            }, 1000);

            loadFiles();
        </script>
    </body>
    </html>
    `);
});

app.listen(port, () => console.log(\`Pocket Hosting V2 running on port \${port}\`));
