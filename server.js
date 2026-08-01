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

  // Nom de fichier temporaire
  const timestamp = Date.now();
  const outputPath = path.join(__dirname, `audio_${timestamp}.%(ext)s`);
  const cookiesPath = path.join(__dirname, 'cookies.txt');

  // Options ajustées pour s'adapter à l'environnement Render sans ffmpeg lourd
  const options = {
    format: 'bestaudio/best',
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addHeader: [
      'referer:https://www.youtube.com/',
      'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  };

  if (fs.existsSync(cookiesPath)) {
    options.cookies = cookiesPath;
  }

  try {
    console.log(`Début du téléchargement pour : ${url}`);
    
    // Téléchargement via yt-dlp
    await ytdlp(url, options);

    // Chercher le fichier généré dans le dossier racine
    const files = fs.readdirSync(__dirname);
    const downloadedFile = files.find(file => file.startsWith(`audio_${timestamp}`));

    if (!downloadedFile) {
      throw new Error("Fichier introuvable après le téléchargement");
    }

    const fullPath = path.join(__dirname, downloadedFile);

    // Envoi du fichier au navigateur
    res.download(fullPath, 'musique.mp3', (err) => {
      // Suppression du fichier temporaire après envoi
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

  } catch (error) {
    console.error("Erreur yt-dlp détaillée :", error);

    // Nettoyage en cas d'erreur
    const files = fs.readdirSync(__dirname);
    const failedFile = files.find(file => file.startsWith(`audio_${timestamp}`));
    if (failedFile) {
      fs.unlinkSync(path.join(__dirname, failedFile));
    }

    res.status(500).json({ error: 'Erreur lors de la conversion ou du téléchargement' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
