// Firebase ve MongoDB için API endpointlerini buraya gir.
// Vercel'de çalıştırılacağı için, backend API'leri de Vercel'in kendi serverless functions'ı olabilir.
const API_BASE_URL = window.location.origin; // Vercel'deki kendi domainin.

// Discord webhook URL'sini buraya gir.
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN';

// Sayfa içeriğini yükleme fonksiyonu
const pageContentEl = document.getElementById('page-content');
const loadingSpinnerEl = document.getElementById('loading-spinner');
const navLinks = document.querySelectorAll('.nav-links a');

const showSpinner = () => {
    loadingSpinnerEl.classList.add('show');
};

const hideSpinner = () => {
    loadingSpinnerEl.classList.remove('show');
};

const pageTemplates = {
    'animes': `
        <h1>Animeler</h1>
        <p>Tüm animeleri buradan görüntüleyebilir, düzenleyebilir veya silebilirsiniz.</p>
        <div id="anime-list" class="anime-list"></div>
    `,
    'create-anime': `
        <h1>Anime Oluştur</h1>
        <p>Yeni bir anime eklemek için aşağıdaki formu doldurun.</p>
        <form id="create-anime-form">
            <div class="form-group">
                <label for="name">İsim:</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="description">Açıklama:</label>
                <textarea id="description" name="description" rows="4" required></textarea>
            </div>
            <div class="form-group">
                <label for="imdb">IMDB:</label>
                <input type="text" id="imdb" name="imdb">
            </div>
            <div class="form-group">
                <label for="image_url">Görsel URL:</label>
                <input type="url" id="image_url" name="image_url" required>
            </div>
            <button type="submit">Anime Oluştur</button>
        </form>
    `,
    'episodes': `
        <h1>Bölümler</h1>
        <p>Tüm bölümleri buradan görüntüleyebilir, düzenleyebilir veya silebilirsiniz.</p>
        <div id="episode-list" class="anime-list"></div>
    `,
    'create-episode': `
        <h1>Bölüm Oluştur</h1>
        <p>Yeni bir bölüm eklemek için aşağıdaki formu doldurun.</p>
        <form id="create-episode-form">
            <div class="form-group">
                <label for="animeId">Anime Seçin:</label>
                <select id="animeId" name="animeId" required>
                    </select>
            </div>
            <div class="form-group">
                <label for="episode_number">Bölüm Numarası:</label>
                <input type="number" id="episode_number" name="episode_number" min="1" required>
            </div>
            <div class="form-group">
                <label for="rating">Bölüm Puanı (0-10):</label>
                <input type="number" id="rating" name="rating" min="0" max="10" step="0.1">
            </div>
            <div class="form-group">
                <label for="translator">Çevirmen:</label>
                <input type="text" id="translator" name="translator" required>
            </div>
            <div class="form-group">
                <label for="encoder">Encoder:</label>
                <input type="text" id="encoder" name="encoder" required>
            </div>
            <div class="form-group">
                <label for="uploader">Uploader:</label>
                <input type="text" id="uploader" name="uploader" required>
            </div>
            <div class="form-group">
                <label for="watch_links">İzleme Linkleri (Her birini yeni satıra yazın):</label>
                <textarea id="watch_links" name="watch_links" rows="4" placeholder="https://animecix.tv/anime-adi-bolum-no&#10;https://openanime.com/anime-adi-bolum-no" required></textarea>
            </div>
            <button type="submit">Bölüm Oluştur</button>
        </form>
    `
};

const loadPage = async (page) => {
    showSpinner();
    
    // Navigasyon linklerini güncelle
    navLinks.forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Sayfa içeriğini yükle
    pageContentEl.innerHTML = pageTemplates[page] || '<h1>Sayfa Bulunamadı</h1>';

    // Sayfaya özel işlemler
    if (page === 'animes') {
        await fetchAnimes();
    } else if (page === 'create-anime') {
        document.getElementById('create-anime-form').addEventListener('submit', handleCreateAnime);
    } else if (page === 'episodes') {
        await fetchEpisodes();
    } else if (page === 'create-episode') {
        await populateAnimeSelect();
        document.getElementById('create-episode-form').addEventListener('submit', handleCreateEpisode);
    }
    
    hideSpinner();
};

// API Fonksiyonları

// Animeleri getir
const fetchAnimes = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/animes`);
        const animes = await response.json();
        const animeListEl = document.getElementById('anime-list');
        animeListEl.innerHTML = animes.map(anime => `
            <div class="anime-card">
                <img src="${anime.image_url}" alt="${anime.name}">
                <div class="anime-info">
                    <h3>${anime.name}</h3>
                    <p>${anime.description.substring(0, 100)}...</p>
                    <div class="anime-actions">
                        <button onclick="editAnime('${anime._id}')">Düzenle</button>
                        <button onclick="deleteAnime('${anime._id}')">Sil</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Animeler getirilirken bir hata oluştu:', error);
        pageContentEl.innerHTML = '<p>Animeler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.</p>';
    }
};

// Yeni anime oluştur
const handleCreateAnime = async (event) => {
    event.preventDefault();
    showSpinner();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_BASE_URL}/api/animes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            alert('Anime başarıyla oluşturuldu!');
            window.location.hash = '#animes';
        } else {
            alert('Anime oluşturulurken bir hata oluştu.');
        }
    } catch (error) {
        console.error('Anime oluşturma hatası:', error);
        alert('Anime oluşturulurken bir hata oluştu.');
    } finally {
        hideSpinner();
    }
};

// Anime seçme kutusunu doldur
const populateAnimeSelect = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/animes`);
        const animes = await response.json();
        const selectEl = document.getElementById('animeId');
        selectEl.innerHTML = animes.map(anime => `<option value="${anime._id}">${anime.name}</option>`).join('');
    } catch (error) {
        console.error('Anime listesi yüklenirken hata:', error);
    }
};

// Yeni bölüm oluştur
const handleCreateEpisode = async (event) => {
    event.preventDefault();
    showSpinner();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.watch_links = data.watch_links.split('\n').map(link => link.trim()).filter(link => link);
    data.episode_number = Number(data.episode_number);
    data.rating = data.rating ? Number(data.rating) : null;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/episodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Bölüm başarıyla oluşturuldu!');
            await sendDiscordNotification(data);
            window.location.hash = '#episodes';
        } else {
            const error = await response.json();
            alert(`Bölüm oluşturulurken bir hata oluştu: ${error.message}`);
        }
    } catch (error) {
        console.error('Bölüm oluşturma hatası:', error);
        alert('Bölüm oluşturulurken bir hata oluştu.');
    } finally {
        hideSpinner();
    }
};

// Discord'a bildirim gönder
const sendDiscordNotification = async (episodeData) => {
    try {
        const animeResponse = await fetch(`${API_BASE_URL}/api/animes/${episodeData.animeId}`);
        const anime = await animeResponse.json();

        const embed = {
            title: `${anime.name} - Bölüm ${episodeData.episode_number} Yayınlandı!`,
            description: `Yeni bölüm çevrildi ve yüklendi.`,
            color: 15339680, // Accent color
            thumbnail: { url: anime.image_url },
            fields: [
                { name: 'Çevirmen', value: episodeData.translator, inline: true },
                { name: 'Encoder', value: episodeData.encoder, inline: true },
                { name: 'Uploader', value: episodeData.uploader, inline: true },
                { name: 'Bölüm Puanı', value: episodeData.rating ? `${episodeData.rating}/10` : 'Yok', inline: true },
            ],
            url: episodeData.watch_links[0], // İlk linki Discord'da ana link olarak göster
            footer: {
                text: 'SomeSubs',
                icon_url: 'https://i.ibb.co/L5w2R3w/logo.png' // Kendi logo URL'nizi girin
            }
        };

        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });

    } catch (error) {
        console.error('Discord bildirim hatası:', error);
    }
};

// URL Hash'ini izle ve sayfa yükle
const handleHashChange = () => {
    const hash = window.location.hash.substring(1) || 'animes';
    loadPage(hash);
};

window.addEventListener('hashchange', handleHashChange);
window.addEventListener('DOMContentLoaded', handleHashChange);

// Global fonksiyonlar (Düzenle/Sil butonları için)
window.editAnime = (animeId) => {
    alert(`Anime ID ${animeId} düzenleme sayfası yakında eklenecek.`);
    // Gerçek bir uygulamada, burada düzenleme formunu yükleme ve verileri getirme kodu olur.
};

window.deleteAnime = async (animeId) => {
    if (confirm('Bu animeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
        try {
            await fetch(`${API_BASE_URL}/api/animes/${animeId}`, { method: 'DELETE' });
            alert('Anime başarıyla silindi.');
            loadPage('animes');
        } catch (error) {
            console.error('Anime silme hatası:', error);
            alert('Anime silinirken bir hata oluştu.');
        }
    }
};

// Episode listesi fonksiyonu
const fetchEpisodes = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/episodes`);
        const episodes = await response.json();
        const episodeListEl = document.getElementById('episode-list');
        episodeListEl.innerHTML = episodes.map(episode => `
            <div class="anime-card">
                <div class="anime-info">
                    <h3>Bölüm ${episode.episode_number}</h3>
                    <p>Anime ID: ${episode.animeId}</p>
                    <div class="anime-actions">
                        <button onclick="editEpisode('${episode._id}')">Düzenle</button>
                        <button onclick="deleteEpisode('${episode._id}')">Sil</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Bölümler getirilirken bir hata oluştu:', error);
        pageContentEl.innerHTML = '<p>Bölümler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.</p>';
    }
};

window.editEpisode = (episodeId) => {
    alert(`Bölüm ID ${episodeId} düzenleme sayfası yakında eklenecek.`);
};

window.deleteEpisode = async (episodeId) => {
    if (confirm('Bu bölümü silmek istediğinize emin misiniz?')) {
        try {
            await fetch(`${API_BASE_URL}/api/episodes/${episodeId}`, { method: 'DELETE' });
            alert('Bölüm başarıyla silindi.');
            loadPage('episodes');
        } catch (error) {
            console.error('Bölüm silme hatası:', error);
            alert('Bölüm silinirken bir hata oluştu.');
        }
    }
};
