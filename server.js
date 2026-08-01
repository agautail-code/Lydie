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

  const options = {
    format: 'ba/b', // Prends la meilleure piste audio ou n'importe quel format par défaut
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
    extractorArgs: 'youtube:player_client=android,web', // Emule un navigateur mobile/web pour éviter les blocages Render
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

    await ytdlp(url, options);

    // Recherche du fichier créé avec le timestamp
    const files = fs.readdirSync(__dirname);
    const downloadedFile = files.find(file => file.startsWith(`audio_${timestamp}`));

    if (!downloadedFile) {
      throw new Error("Fichier introuvable après téléchargement");
    }

    const fullPath = path.join(__dirname, downloadedFile);

    // Téléchargement du fichier par le client
    res.download(fullPath, `${downloadedFile}`, (err) => {
      // Nettoyage du fichier temporaire après l'envoi
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

  } catch (error) {
    console.error("Erreur yt-dlp détaillée :", error);

    // Nettoyage si erreur
    try {
      const files = fs.readdirSync(__dirname);
      const failedFile = files.find(file => file.startsWith(`audio_${timestamp}`));
      if (failedFile) {
        fs.unlinkSync(path.join(__dirname, failedFile));
      }
    } catch (cleanErr) {
      console.error("Erreur nettoyage :", cleanErr);
    }

    res.status(500).json({ error: 'Erreur lors de la conversion ou du téléchargement' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
