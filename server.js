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

// Serve Public Files (Dashboard)
app.use(express.static('public'));

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

// Main Route - Serve the HTML file directly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.listen(port, () => console.log(`Pocket Hosting V2 running on port ${port}`));
