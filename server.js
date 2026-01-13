const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Setup storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});

const upload = multer({ storage: storage });

// Serve static files (uploaded files)
app.use('/files', express.static(path.join(__dirname, 'uploads')));

// Premium Dark Dashboard UI
app.get('/', (req, res) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    const uptime = new Date(process.uptime() * 1000).toISOString().substr(11, 8);

    fs.readdir(uploadDir, (err, files) => {
        let fileListHtml = files.map(f => `
            <div class="file-card">
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <span class="file-name">${f}</span>
                    <span class="file-meta">${(fs.statSync(path.join(uploadDir, f)).size / 1024).toFixed(1)} KB</span>
                </div>
                <div class="file-actions">
                    <a href="/files/${f}" download class="btn-action btn-download" title="Download">⬇️</a>
                    <a href="/files/${f}" target="_blank" class="btn-action btn-view" title="View">👁️</a>
                </div>
            </div>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>🚀 Pocket Console</title>
                <style>
                    :root {
                        --bg-dark: #0f1014;
                        --bg-card: #1b1e2b;
                        --primary: #5865F2; /* Discord Blurple */
                        --accent: #00cec9;
                        --text-main: #ffffff;
                        --text-muted: #a0a0a0;
                        --success: #2ecc71;
                        --danger: #e74c3c;
                    }

                    body {
                        font-family: 'Segoe UI', 'Roboto', sans-serif;
                        background-color: var(--bg-dark);
                        color: var(--text-main);
                        margin: 0;
                        padding: 0;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }

                    .navbar {
                        width: 100%;
                        background: rgba(27, 30, 43, 0.9);
                        padding: 15px 0;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                        backdrop-filter: blur(10px);
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        border-bottom: 1px solid #333;
                    }

                    .nav-content {
                        max-width: 1000px;
                        margin: 0 auto;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0 20px;
                    }

                    .logo {
                        font-size: 1.5rem;
                        font-weight: 800;
                        color: var(--text-main);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .logo span { color: var(--primary); }

                    .status-badge {
                        background: rgba(46, 204, 113, 0.2);
                        color: var(--success);
                        padding: 5px 12px;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .status-dot {
                        width: 8px;
                        height: 8px;
                        background: var(--success);
                        border-radius: 50%;
                        box-shadow: 0 0 10px var(--success);
                        animation: pulse 2s infinite;
                    }

                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }

                    .main-container {
                        width: 100%;
                        max-width: 1000px;
                        margin: 30px auto;
                        padding: 0 20px;
                        display: grid;
                        grid-template-columns: 1fr 300px;
                        gap: 25px;
                    }

                    @media (max-width: 768px) {
                        .main-container { grid-template-columns: 1fr; }
                    }

                    .card {
                        background: var(--bg-card);
                        border-radius: 16px;
                        padding: 25px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        border: 1px solid #2a2d3d;
                    }

                    h2 { margin-top: 0; font-size: 1.2rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

                    /* Upload Zone */
                    .upload-zone {
                        border: 2px dashed #3a3f55;
                        border-radius: 12px;
                        padding: 40px;
                        text-align: center;
                        transition: all 0.3s;
                        cursor: pointer;
                        position: relative;
                        background: rgba(255,255,255,0.02);
                        margin-bottom: 20px;
                    }

                    .upload-zone:hover {
                        border-color: var(--primary);
                        background: rgba(88, 101, 242, 0.05);
                    }

                    .file-input {
                        position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;
                    }

                    .upload-icon { font-size: 3rem; margin-bottom: 15px; opacity: 0.7; }
                    
                    /* File List */
                    .file-list {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }

                    .file-card {
                        background: rgba(255,255,255,0.03);
                        padding: 12px 15px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        border: 1px solid transparent;
                        transition: all 0.2s;
                    }

                    .file-card:hover {
                        background: rgba(255,255,255,0.05);
                        border-color: #333;
                        transform: translateX(5px);
                    }

                    .file-icon { font-size: 1.2rem; margin-right: 15px; }
                    
                    .file-info { flex: 1; display: flex; flex-direction: column; }
                    .file-name { font-weight: 500; color: var(--text-main); }
                    .file-meta { font-size: 0.75rem; color: var(--text-muted); }

                    .btn-action {
                        text-decoration: none;
                        padding: 8px;
                        border-radius: 6px;
                        background: rgba(255,255,255,0.1);
                        margin-left: 5px;
                        transition: 0.2s;
                    }
                    .btn-action:hover { background: var(--primary); }

                    /* Stats Panel */
                    .stats-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 15px;
                    }

                    .stat-item {
                        background: rgba(0,0,0,0.2);
                        padding: 15px;
                        border-radius: 10px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .stat-label { color: var(--text-muted); font-size: 0.9rem; }
                    .stat-value { font-weight: bold; font-family: 'Courier New', monospace; color: var(--accent); }

                    /* Power Button */
                    .power-section {
                        text-align: center;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #333;
                    }

                    .btn-power {
                        background: var(--success);
                        color: white;
                        border: none;
                        padding: 12px 40px;
                        border-radius: 50px;
                        font-weight: bold;
                        font-size: 1rem;
                        cursor: pointer;
                        box-shadow: 0 0 20px rgba(46, 204, 113, 0.4);
                        transition: all 0.3s;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }

                    .btn-power:hover {
                        transform: scale(1.05);
                        box-shadow: 0 0 30px rgba(46, 204, 113, 0.6);
                    }
                    
                    .console-log {
                        background: #000;
                        color: #0f0;
                        font-family: 'Courier New', monospace;
                        padding: 15px;
                        border-radius: 8px;
                        font-size: 0.8rem;
                        margin-top: 20px;
                        opacity: 0.7;
                    }
                </style>
            </head>
            <body>
                <nav class="navbar">
                    <div class="nav-content">
                        <div class="logo">⚡ Pocket<span>Host</span></div>
                        <div class="status-badge">
                            <div class="status-dot"></div>
                            Online
                        </div>
                    </div>
                </nav>

                <div class="main-container">
                    <!-- Right/Main Column -->
                    <div class="content-col">
                        <div class="card">
                            <h2>File Manager</h2>
                            
                            <form action="/upload" method="post" enctype="multipart/form-data">
                                <div class="upload-zone">
                                    <input type="file" name="anyfile" class="file-input" onchange="this.form.submit()">
                                    <div class="upload-icon">☁️</div>
                                    <h3 style="margin:0;">Click or Drop Files</h3>
                                    <p style="color:var(--text-muted); margin-top:5px;">Instant deploy to your cloud</p>
                                </div>
                            </form>

                            <div class="file-list">
                                ${fileListHtml || '<div style="text-align:center; padding:20px; color:#555;">No files deployed yet.</div>'}
                            </div>
                        </div>
                    </div>

                    <!-- Left/Sidebar Column -->
                    <div class="sidebar-col">
                        <div class="card">
                            <h2>Server Status</h2>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-label">Uptime</span>
                                    <span class="stat-value">${uptime}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Memory</span>
                                    <span class="stat-value">Healthy</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Port</span>
                                    <span class="stat-value">:3000</span>
                                </div>
                            </div>

                            <div class="power-section">
                                <button class="btn-power" onclick="window.location.reload()">RESTART UI</button>
                                <p style="font-size:0.75rem; color:#666; margin-top:10px;">Server is running locally</p>
                            </div>
                        </div>

                        <div class="console-log">
                            > System Initialized...<br>
                            > Waiting for internal connection...<br>
                            > Ready to accept files.
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
    });
});

// Handle Upload
app.post('/upload', upload.single('anyfile'), (req, res, next) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('Please upload a file');
    }
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`\n✅ Pocket Hosting is Ready!`);
    console.log(`🔗 Local Access: http://localhost:${port}`);
    console.log(`🌍 To make it public, use Cloudflare Tunnel or Playit.gg\n`);
});
