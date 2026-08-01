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

  // Options optimisées pour contourner les blocages Render / Cloud
  const options = {
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
    // On force l'utilisation des clients iOS et TV pour passer outre les restrictions DataCenter
    extractorArgs: 'youtube:player_client=ios,mweb,tv',
    addHeader: [
      'referer:https://www.youtube.com/',
      'user-agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    ]
  };

  if (fs.existsSync(cookiesPath)) {
    options.cookies = cookiesPath;
  }

  try {
    console.log(`Début du téléchargement pour : ${url}`);

    await ytdlp(url, options);

    // Trouver le fichier téléchargé
    const files = fs.readdirSync(__dirname);
    const downloadedFile = files.find(file => file.startsWith(`audio_${timestamp}`));

    if (!downloadedFile) {
      throw new Error("Fichier introuvable après le téléchargement");
    }

    const fullPath = path.join(__dirname, downloadedFile);

    res.download(fullPath, downloadedFile, (err) => {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

  } catch (error) {
    console.error("Erreur yt-dlp détaillée :", error);

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
