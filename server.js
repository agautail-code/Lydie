const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Backend opérationnelle');
});

app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  const timestamp = Date.now();
  const outputPath = path.join(__dirname, `audio_${timestamp}.%(ext)s`);
  const cookiesPath = path.join(__dirname, 'cookies.txt');

  // Configuration universelle : évite de bloquer sur un format spécifique
  const options = {
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
    // Emulation de l'application Android pour contourner le blocage cloud Render
    extractorArgs: 'youtube:player_client=android',
    addHeader: [
      'user-agent:Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    ]
  };

  if (fs.existsSync(cookiesPath)) {
    options.cookies = cookiesPath;
  }

  try {
    console.log(`Début du téléchargement pour : ${url}`);

    await ytdlp(url, options);

    // Récupération du fichier généré quel que soit son extension (.m4a, .webm, .mp3, etc.)
    const files = fs.readdirSync(__dirname);
    const downloadedFile = files.find(file => file.startsWith(`audio_${timestamp}`));

    if (!downloadedFile) {
      throw new Error("Fichier introuvable après le téléchargement");
    }

    const fullPath = path.join(__dirname, downloadedFile);

    // Envoi du fichier au navigateur
    res.download(fullPath, 'musique.mp3', (err) => {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

  } catch (error) {
    console.error("Erreur yt-dlp :", error);

    try {
      const files = fs.readdirSync(__dirname);
      const failedFile = files.find(file => file.startsWith(`audio_${timestamp}`));
      if (failedFile) {
        fs.unlinkSync(path.join(__dirname, failedFile));
      }
    } catch (cleanErr) {
      console.error("Nettoyage impossible :", cleanErr);
    }

    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
