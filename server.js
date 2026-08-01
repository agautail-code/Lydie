const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  const outputPath = path.join(__dirname, `audio_${Date.now()}.mp3`);
  const cookiesPath = path.join(__dirname, 'cookies.txt');

  const options = {
    extractAudio: true,
    audioFormat: 'mp3',
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addHeader: [
      'referer:youtube.com',
      'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  };

  if (fs.existsSync(cookiesPath)) {
    options.cookies = cookiesPath;
  }

  try {
    await ytdlp(url, options);

    res.download(outputPath, 'audio.mp3', (err) => {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    });
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    res.status(500).json({ error: 'Erreur lors de la conversion ou du téléchargement' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
