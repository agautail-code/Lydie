const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Backend MP3 opérationnelle');
});

app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  const timestamp = Date.now();
  const outputPath = path.join(__dirname, `audio_${timestamp}.mp3`);
  const cookiesPath = path.join(__dirname, 'cookies.txt');

  const options = {
    output: outputPath,
    format: 'bestaudio/best',
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: '0',
    ffmpegLocation: ffmpegPath,
    noCheckCertificates: true,
    noWarnings: true,
    extractorArgs: 'youtube:player_client=ios,web',
    addHeader: [
      'user-agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'
    ]
  };

  if (fs.existsSync(cookiesPath)) {
    options.cookies = cookiesPath;
  }

  try {
    await ytdlp(url, options);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Le fichier MP3 n'a pas été généré");
    }

    res.download(outputPath, 'musique.mp3', (err) => {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    });

  } catch (error) {
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (cleanErr) {}
    }
    res.status(500).json({ error: 'Erreur lors de la conversion ou du téléchargement' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
