const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Anahtarınızı buraya girin
const OMDb_API_KEY = '69dbe0c3';
const OMDb_API_URL = 'http://www.omdbapi.com/';

app.get('/api/anime-data', async (req, res) => {
    const { title } = req.query;

    if (!title) {
        return res.status(400).json({ error: 'Başlık bilgisi eksik.' });
    }

    try {
        const response = await fetch(`${OMDb_API_URL}?apikey=${OMDb_API_KEY}&t=${encodeURIComponent(title)}&plot=full`);
        const data = await response.json();

        if (data.Response === 'False') {
            return res.status(404).json({ error: 'Anime bulunamadı.' });
        }

        const formattedData = {
            description: data.Plot,
            imdbUrl: `https://www.imdb.com/title/${data.imdbID}/`,
            imdbRating: data.imdbRating,
            imageUrl: data.Poster,
            genres: data.Genre ? data.Genre.split(',').map(g => g.trim()) : []
        };

        res.json(formattedData);
    } catch (error) {
        console.error('OMDb API hatası:', error);
        res.status(500).json({ error: 'Veri çekilirken bir hata oluştu.' });
    }
});

// Proxy sunucusu dinlemeye başlar
app.listen(PORT, () => {
    console.log(`Proxy sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
