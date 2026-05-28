import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 2004;

// Middleware
app.use(express.json());
app.use(express.static('.')); // Langsung dari root folder

// Halaman utama
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Salss Panel - Demo</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                background: linear-gradient(135deg, #0f0c29, #1a1a3e, #24243e);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
            }
            .container { text-align: center; padding: 2rem; }
            h1 { font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(135deg, #8b5cf6, #f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent; }
            .status { background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; padding: 0.5rem 1rem; border-radius: 2rem; display: inline-block; margin-bottom: 2rem; }
            .card { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 1rem; padding: 2rem; margin-top: 2rem; }
            button { background: linear-gradient(135deg, #8b5cf6, #6d28d9); border: none; padding: 0.8rem 1.5rem; border-radius: 2rem; color: white; font-weight: bold; cursor: pointer; margin-top: 1rem; }
            button:hover { transform: translateY(-2px); }
            .footer { margin-top: 2rem; font-size: 0.7rem; color: #8ca3bf; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🐉 Salss Panel</h1>
            <div class="status">✅ Server Online</div>
            <div class="card">
                <h2>Deploy Berhasil! 🚀</h2>
                <p>Server berjalan di port ${PORT}</p>
                <p style="margin-top: 0.5rem;">Waktu: ${new Date().toLocaleString()}</p>
                <button onclick="alert('Demo button clicked!')">Klik Saya</button>
            </div>
            <div class="footer">© 2024 Salss Panel - All Rights Reserved</div>
        </div>
    </body>
    </html>
  `);
});

// API contoh
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    time: new Date().toISOString(),
    port: PORT
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/status\n`);
});
