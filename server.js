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

// HTML UI with Premium Design
app.get('/', (req, res) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    fs.readdir(uploadDir, (err, files) => {
        let fileListHtml = files.map(f => `
            <div class="file-card">
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <a href="/files/${f}" target="_blank" class="file-name">${f}</a>
                    <span class="file-size">${(fs.statSync(path.join(uploadDir, f)).size / 1024).toFixed(1)} KB</span>
                </div>
                <div class="file-actions">
                    <a href="/files/${f}" download class="btn-download">⬇️</a>
                </div>
            </div>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>✨ Pocket Hosting</title>
                <style>
                    :root {
                        --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        --glass-bg: rgba(255, 255, 255, 0.95);
                        --card-bg: white;
                        --primary: #6c5ce7;
                        --text: #2d3436;
                        --text-light: #636e72;
                    }

                    body {
                        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                        margin: 0;
                        min-height: 100vh;
                        background: var(--bg-gradient);
                        padding: 20px;
                        color: var(--text);
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                    }

                    .container {
                        background: var(--glass-bg);
                        width: 100%;
                        max-width: 800px;
                        border-radius: 20px;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                        padding: 30px;
                        margin-top: 40px;
                        backdrop-filter: blur(10px);
                    }

                    header {
                        text-align: center;
                        margin-bottom: 30px;
                    }

                    h1 {
                        margin: 0;
                        color: var(--primary);
                        font-size: 2.5em;
                        font-weight: 800;
                    }

                    .subtitle {
                        color: var(--text-light);
                        margin-top: 5px;
                    }

                    .upload-zone {
                        border: 3px dashed #a29bfe;
                        border-radius: 15px;
                        padding: 40px;
                        text-align: center;
                        background: #f8f9fa;
                        transition: all 0.3s ease;
                        cursor: pointer;
                        position: relative;
                    }

                    .upload-zone:hover {
                        background: #eef2ff;
                        border-color: var(--primary);
                        transform: translateY(-2px);
                    }

                    .file-input {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        opacity: 0;
                        cursor: pointer;
                    }

                    .upload-btn {
                        background: var(--primary);
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 50px;
                        font-size: 1.1em;
                        font-weight: 600;
                        cursor: pointer;
                        margin-top: 15px;
                        box-shadow: 0 5px 15px rgba(108, 92, 231, 0.3);
                        transition: transform 0.2s;
                    }

                    .upload-btn:hover {
                        transform: scale(1.05);
                    }

                    .grid-container {
                        margin-top: 30px;
                        display: grid;
                        gap: 15px;
                    }

                    .file-card {
                        background: var(--card-bg);
                        border-radius: 12px;
                        padding: 15px;
                        display: flex;
                        align-items: center;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                        border: 1px solid #eee;
                        transition: transform 0.2s;
                    }

                    .file-card:hover {
                        transform: translateX(5px);
                        border-color: var(--primary);
                    }

                    .file-icon {
                        font-size: 1.5em;
                        margin-right: 15px;
                        background: #f1f2f6;
                        width: 45px;
                        height: 45px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 10px;
                    }

                    .file-info {
                        flex-grow: 1;
                        overflow: hidden;
                    }

                    .file-name {
                        display: block;
                        font-weight: 600;
                        color: var(--text);
                        text-decoration: none;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .file-name:hover {
                        color: var(--primary);
                    }

                    .file-size {
                        font-size: 0.85em;
                        color: var(--text-light);
                    }

                    .btn-download {
                        text-decoration: none;
                        padding: 8px;
                        border-radius: 8px;
                        transition: background 0.2s;
                    }

                    .btn-download:hover {
                        background: #f1f2f6;
                    }

                    .status-bar {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 0.9em;
                        color: var(--text-light);
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>✨ Pocket Hosting</h1>
                        <p class="subtitle">Your private, unlimited cloud space.</p>
                    </header>
                    
                    <form action="/upload" method="post" enctype="multipart/form-data">
                        <div class="upload-zone">
                            <input type="file" name="anyfile" class="file-input" onchange="this.form.submit()">
                            <div style="font-size: 3em; margin-bottom: 10px;">☁️</div>
                            <h3>Drop files here or click to upload</h3>
                            <p style="color: #888;">Supports images, videos, zips, anything.</p>
                        </div>
                    </form>

                    <div class="grid-container">
                        ${fileListHtml || '<div style="text-align:center; color:#999; padding:20px;">No files yet. Upload something! 🚀</div>'}
                    </div>
                    
                    <div class="status-bar">
                        🟢 Server Active | 🏠 Running Locally | 🌐 Make Public with Playit.gg
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
