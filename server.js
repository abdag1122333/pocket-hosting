const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
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

// Global State
let runningProcess = null;
let logBuffer = [];

function addToLog(data) {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            logBuffer.push(`[${new Date().toLocaleTimeString()}] ${line}`);
            if (logBuffer.length > 500) logBuffer.shift();
        }
    });
}

// Routes
app.use('/files', express.static('uploads'));

// API
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

app.post('/api/run', (req, res) => {
    const { command } = req.body;
    if (runningProcess) return res.json({ success: false, message: 'Process running' });

    addToLog(`> Starting: ${command}`);
    const args = command.split(' ');
    const cmd = args.shift();

    try {
        runningProcess = spawn(cmd, args, { cwd: './uploads', shell: true });
        runningProcess.stdout.on('data', addToLog);
        runningProcess.stderr.on('data', addToLog);
        runningProcess.on('close', (code) => {
            addToLog(`> Exited with code ${code}`);
            runningProcess = null;
        });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/stop', (req, res) => {
    if (runningProcess) {
        runningProcess.kill();
        runningProcess = null;
        addToLog('> Stopped by user.');
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.get('/api/logs', (req, res) => res.json(logBuffer));

// UI
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
            :root { --bg: #0f172a; --panel: #1e293b; --primary: #3b82f6; --text: #f8fafc; }
            * { box-sizing: border-box; }
            body { background: var(--bg); color: var(--text); font-family: sans-serif; margin: 0; padding: 20px; height: 100vh; display: flex; flex-direction: column; }
            .navbar { display: flex; justify-content: space-between; padding: 15px; background: var(--panel); border-radius: 12px; margin-bottom: 20px; }
            .main-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; flex: 1; min-height: 0; }
            .panel { background: var(--panel); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
            .file-list { flex: 1; overflow-y: auto; }
            .file-item { padding: 10px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; cursor: pointer; }
            .file-item:hover { background: #334155; }
            .terminal { background: black; color: #10b981; flex: 1; font-family: monospace; padding: 10px; overflow-y: auto; margin-bottom: 15px; border-radius: 8px; }
            .controls { display: flex; gap: 10px; }
            input, button { padding: 10px; border-radius: 6px; border: none; }
            input { flex: 1; background: #0f172a; color: white; border: 1px solid #334155; }
            button { background: var(--primary); color: white; cursor: pointer; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); justify-content: center; align-items: center; }
            textarea { width: 80%; height: 80%; background: #1e293b; color: white; padding: 20px; border-radius: 12px; }
        </style>
    </head>
    <body>
        <div class="navbar">
            <div style="font-weight:bold; font-size:1.2rem;">⚡ Pocket Hosting V2</div>
            <div>Port ${port}</div>
        </div>
        <div class="main-grid">
            <div class="panel">
                <h3>Files</h3>
                <div style="margin-bottom:10px; border:2px dashed #475569; padding:10px; text-align:center; cursor:pointer;" onclick="document.getElementById('f').click()">Upload File</div>
                <input type="file" id="f" hidden onchange="upload(this.files)">
                <div class="file-list" id="fl"></div>
            </div>
            <div class="panel">
                <h3>Console</h3>
                <div class="terminal" id="term"></div>
                <div class="controls">
                    <input type="text" id="cmd" placeholder="node server.js">
                    <button onclick="run()">Run</button>
                    <button onclick="stop()" style="background:#ef4444">Stop</button>
                </div>
            </div>
        </div>
        <div class="modal" id="editor">
            <textarea id="code"></textarea>
            <button onclick="save()" style="position:fixed; bottom:20px; right:20px;">Save</button>
            <button onclick="document.getElementById('editor').style.display='none'" style="position:fixed; top:20px; right:20px; background:red;">X</button>
        </div>
        <script>
            const $ = id => document.getElementById(id);
            let curFile = '';
            async function load() {
                const res = await fetch('/api/files');
                const files = await res.json();
                $('fl').innerHTML = files.map(f => \`<div class="file-item"><span onclick="edit('\${f.name}')">\${f.name}</span> <span onclick="del('\${f.name}')">🗑️</span></div>\`).join('');
            }
            async function upload(files) {
                const fd = new FormData(); fd.append('file', files[0]);
                await fetch('/upload', { method: 'POST', body: fd }); load();
            }
            async function del(n) { if(confirm('Del?')) await fetch('/api/delete', { method: 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({filename:n})}); load(); }
            async function edit(n) {
                curFile = n;
                const res = await fetch('/api/read', { method: 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({filename:n})});
                const d = await res.json();
                $('code').value = d.content; $('editor').style.display = 'flex';
            }
            async function save() {
                await fetch('/api/save', { method: 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({filename:curFile, content:$('code').value})});
                $('editor').style.display = 'none';
            }
            async function run() { await fetch('/api/run', { method: 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({command:$('cmd').value})}); }
            async function stop() { await fetch('/api/stop', { method: 'POST' }); }
            setInterval(async () => {
                const res = await fetch('/api/logs'); const logs = await res.json();
                $('term').innerText = logs.join('\\n'); $('term').scrollTop = $('term').scrollHeight;
            }, 1000);
            load();
        </script>
    </body>
    </html>
    `);
});

app.listen(port, () => console.log(\`Pocket Hosting V2 running on port \${port}\`));
