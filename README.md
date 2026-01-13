# Pocket Hosting Kit 🚀

This is your own private hosting server!
It runs on **your own computer**, so it's free, unlimited, and you have full control.

## How to Start (Windows)

1.  **Install Node.js**: If you don't have it, download from [nodejs.org](https://nodejs.org/).
2.  **Open Terminal**: Open Command Prompt (cmd) in this folder.
3.  **Install**: Type `npm install` and hit Enter.
4.  **Run**: Type `npm start` and hit Enter.
5.  **Visit**: Open `http://localhost:3000` in your browser.

## How to Make it Public (24/7 Access)

To let others access your hosting (or access it from your phone), you need a **Tunnel**.
Since you used **Playit.gg** before, that is the easiest valid option for 24/7:

1.  Download the **Playit.gg program** for Windows.
2.  Run strict.
3.  Add a **Web Tunnel (HTTP)** pointing to `127.0.0.1:3000`.
4.  Playit will give you a public URL (e.g., `fancy-name.playit.gg`).
5.  Share that URL! Anyone can now see your files.

**Alternative (Cloudflare Tunnel - No Account):**
1.  Download `cloudflared.exe`.
2.  Run: `cloudflared tunnel --url http://localhost:3000`
3.  It will give you a random `trycloudflare.com` link instantly.

Enjoy your unlimited, free hosting!
