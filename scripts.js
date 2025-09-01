// Güvenlik Uyarısı: API anahtarlarınızı doğrudan koda gömmeyin.
// Bu Vercel gibi ortamlarda ortam değişkenleri (environment variables) ile yönetilmelidir.
const firebaseConfig = {
    apiKey: "AIzaSyCpcXdVwJv3LUN8YVknQQBXk9jCw2BeKXo",
  authDomain: "somesubspanel.firebaseapp.com",
  projectId: "somesubspanel",
  storageBucket: "somesubspanel.firebasestorage.app",
  messagingSenderId: "1084301012165",
  appId: "1:1084301012165:web:29c773daea44b35f8f54ac",
  measurementId: "G-BBLN91Q0TV"
};

const DISCORD_WEBHOOK_URL = 'https://ptb.discord.com/api/webhooks/1411290548840693831/3q18pGbU0SFzX76bhGBDqEVdw5XGx_v_oeNYBBK_MUDUN3VOj2DPWO4bAtVp-F6HF2mrF';

// Firebase ve Firestore'u başlat
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

const elements = {
    authView: document.getElementById('auth-view'),
    mainApp: document.getElementById('main-app'),
    views: document.querySelectorAll('.view'),
    navItems: document.querySelectorAll('.nav-item'),
    loadingSpinner: document.getElementById('loading-spinner'),
    animesList: document.getElementById('animes-list'),
    episodesList: document.getElementById('episodes-list'),
    animeSelect: document.getElementById('episode-anime-select'),
    createAnimeForm: document.getElementById('create-anime-form'),
    createEpisodeForm: document.getElementById('create-episode-form'),
    animeDetailView: document.getElementById('anime-detail-view'),
    animeDetailCard: document.getElementById('anime-detail-card'),
    animeEpisodesList: document.getElementById('anime-episodes-list'),
    backToAnimesButton: document.getElementById('back-to-animes'),
    loadMoreAnimesButton: document.getElementById('load-more-animes'),
    // Auth Elemanları
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    showRegisterBtn: document.getElementById('show-register'),
    showLoginBtn: document.getElementById('show-login'),
    loginFormCard: document.getElementById('login-form-card'),
    registerFormCard: document.getElementById('register-form-card'),
    logoutButton: document.getElementById('logout-button'),
    requestsView: document.getElementById('requests-view'),
    requestsList: document.getElementById('requests-list'),
    requestsNavItem: document.getElementById('requests-nav-item'),
    // Custom Modal
    customModal: document.getElementById('custom-modal'),
    modalMessage: document.getElementById('modal-message'),
    modalOkButton: document.getElementById('modal-ok-button'),
};

const animeForm = {
    name: document.getElementById('anime-name'),
    description: document.getElementById('anime-description'),
    imdb: document.getElementById('anime-imdb'),
    imageUrl: document.getElementById('anime-image-url'),
    genres: document.getElementById('anime-genres'),
    submitBtn: document.querySelector('#create-anime-form button')
};

const episodeForm = {
    animeId: document.getElementById('episode-anime-select'),
    season: document.getElementById('episode-season'),
    number: document.getElementById('episode-number'),
    duration: document.getElementById('episode-duration'),
    rating: document.getElementById('episode-rating'),
    translator: document.getElementById('episode-translator'),
    encoder: document.getElementById('episode-encoder'),
    uploader: document.getElementById('episode-uploader'),
    links: document.getElementById('episode-links'),
    submitBtn: document.querySelector('#create-episode-form button')
};

let isEditing = false;
let currentEditId = null;
let lastVisibleAnime = null;
let currentUser = null;

// Custom modal gösteren fonksiyon
const showModal = (message) => {
    elements.modalMessage.textContent = message;
    elements.customModal.classList.remove('hidden');
};

const hideModal = () => {
    elements.modalOkButton.onclick = null; // Eski handler'ı temizle
    elements.customModal.classList.add('hidden');
};

const showView = (id) => {
    elements.views.forEach(view => view.classList.add('hidden'));
    const activeView = document.getElementById(id);
    if (activeView) {
        activeView.classList.remove('hidden');
    }

    elements.navItems.forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`[data-view="${id}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
};

const showSpinner = () => {
    elements.loadingSpinner.classList.remove('hidden');
};

const hideSpinner = () => {
    elements.loadingSpinner.classList.add('hidden');
};

const showLoadingWithText = (text) => {
    elements.loadingSpinner.classList.remove('hidden');
    document.querySelector('.loading-text').textContent = text;
};

const getLinkHost = (url) => {
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.split('.');
        if (parts.length > 1) {
            return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
        }
        return hostname;
    } catch (e) {
        return 'Geçersiz Link';
    }
};

const renderAnimes = async (loadMore = false) => {
    showSpinner();
    if (!loadMore) {
        elements.animesList.innerHTML = '';
        lastVisibleAnime = null;
        elements.loadMoreAnimesButton.classList.add('hidden');
    }

    let query = db.collection('animes').orderBy('name').limit(10);
    if (lastVisibleAnime) {
        query = query.startAfter(lastVisibleAnime);
    }
    
    try {
        const snapshot = await query.get();
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        
        snapshot.forEach(doc => {
            const anime = doc.data();
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <img src="${anime.imageUrl}" alt="${anime.name}" class="card-image">
                <div class="card-content">
                    <h3 class="card-title">${anime.name}</h3>
                    <p class="card-description">${anime.description}</p>
                </div>
            `;
            card.addEventListener('click', () => showAnimeDetail(doc.id, anime));
            elements.animesList.appendChild(card);
        });

        if (lastDoc) {
            lastVisibleAnime = lastDoc;
            elements.loadMoreAnimesButton.classList.remove('hidden');
        } else {
            elements.loadMoreAnimesButton.classList.add('hidden');
        }
    } catch (error) {
        console.error("Animeler yüklenirken hata oluştu: ", error);
    } finally {
        hideSpinner();
    }
};

const renderEpisodes = async () => {
    showSpinner();
    elements.episodesList.innerHTML = '';
    try {
        const snapshot = await db.collection('episodes').orderBy('createdAt', 'desc').get();
        for (const doc of snapshot.docs) {
            const episode = doc.data();
            const animeDoc = await db.collection('animes').doc(episode.animeId).get();
            if (animeDoc.exists) {
                const anime = animeDoc.data();
                const card = createEpisodeCard(doc.id, episode, anime);
                elements.episodesList.appendChild(card);
            }
        }
    } catch (error) {
        console.error("Bölümler yüklenirken hata oluştu: ", error);
    } finally {
        hideSpinner();
    }
};

const showAnimeDetail = async (animeId, animeData) => {
    showSpinner();
    elements.animeDetailCard.innerHTML = `
        <img src="${animeData.imageUrl}" alt="${animeData.name}" class="detail-image">
        <div class="detail-content">
            <h2 class="detail-title">${animeData.name}</h2>
            <p class="detail-description">${animeData.description}</p>
            ${animeData.imdbUrl ? `<p class="info-item"><b>IMDb:</b> <a href="${animeData.imdbUrl}" target="_blank">${animeData.imdbUrl}</a></p>` : ''}
            ${animeData.genres ? `<p class="info-item"><b>Türler:</b> ${animeData.genres.join(', ')}</p>` : ''}
            <button class="edit-button" data-id="${animeId}" data-type="anime">
                <img src="https://www.svgrepo.com/show/440507/edit.svg" alt="Düzenle">
            </button>
            <button class="delete-button" data-id="${animeId}" data-type="anime">
                <img src="https://www.svgrepo.com/show/440520/trash.svg" alt="Sil">
            </button>
        </div>
    `;
    
    elements.animeDetailCard.querySelector('.edit-button').addEventListener('click', (e) => {
        e.stopPropagation();
        editData('animes', animeId, animeData);
    });
    
    elements.animeDetailCard.querySelector('.delete-button').addEventListener('click', (e) => {
        e.stopPropagation();
        showModal('Bu animeyi ve tüm bölümlerini silmek istediğinize emin misiniz?');
        elements.modalOkButton.onclick = () => {
            hideModal();
            deleteAnimeAndEpisodes(animeId);
        };
    });

    elements.animeEpisodesList.innerHTML = '';
    try {
        const snapshot = await db.collection('episodes')
            .where('animeId', '==', animeId)
            .orderBy('number', 'asc')
            .get();

        snapshot.forEach(doc => {
            const episode = doc.data();
            const card = createEpisodeCard(doc.id, episode);
            elements.animeEpisodesList.appendChild(card);
        });
    } catch (error) {
        console.error("Anime bölümleri yüklenirken hata oluştu: ", error);
    } finally {
        hideSpinner();
    }
    showView('anime-detail-view');
};

const createEpisodeCard = (episodeId, episodeData, animeData = null) => {
    const card = document.createElement('div');
    card.classList.add('episode-card');
    card.innerHTML = `
        <h4 class="episode-number">${episodeData.season}. Sezon - ${episodeData.number}. Bölüm</h4>
        ${animeData ? `<p><b>Anime:</b> ${animeData.name}</p>` : ''}
        <div class="episode-meta">
            ${episodeData.duration ? `<span><b>Süre:</b> ${episodeData.duration}</span>` : ''}
            ${episodeData.rating ? `<span><b>Puan:</b> ${episodeData.rating}</span>` : ''}
            ${episodeData.translator ? `<span><b>Çevirmen:</b> ${episodeData.translator}</span>` : ''}
            ${episodeData.encoder ? `<span><b>Encoder:</b> ${episodeData.encoder}</span>` : ''}
            ${episodeData.uploader ? `<span><b>Uploader:</b> ${episodeData.uploader}</span>` : ''}
        </div>
        <ul class="links-list">
            ${episodeData.links.map(link => `<li><a href="${link}" target="_blank">${getLinkHost(link)}</a></li>`).join('')}
        </ul>
        <button class="edit-button" data-id="${episodeId}" data-type="episode">
            <img src="https://www.svgrepo.com/show/440507/edit.svg" alt="Düzenle">
        </button>
        <button class="delete-button" data-id="${episodeId}" data-type="episode">
            <img src="https://www.svgrepo.com/show/440520/trash.svg" alt="Sil">
        </button>
    `;

    card.querySelector('.edit-button').addEventListener('click', (e) => {
        e.stopPropagation();
        editData('episodes', episodeId, episodeData);
    });

    card.querySelector('.delete-button').addEventListener('click', (e) => {
        e.stopPropagation();
        showModal('Bu bölümü silmek istediğinize emin misiniz?');
        elements.modalOkButton.onclick = () => {
            hideModal();
            deleteData('episodes', episodeId, episodeData.animeId);
        };
    });

    return card;
};

const deleteData = async (collection, id, animeId = null) => {
    showSpinner();
    try {
        await db.collection(collection).doc(id).delete();
        showModal('Başarıyla silindi!');
        if (collection === 'animes') {
            renderAnimes();
            showView('animes-view');
        } else {
            if (document.getElementById('anime-detail-view').classList.contains('active')) {
                const animeDoc = await db.collection('animes').doc(animeId).get();
                if (animeDoc.exists) {
                    showAnimeDetail(animeId, animeDoc.data());
                }
            } else {
                renderEpisodes();
                showView('episodes-view');
            }
        }
    } catch (error) {
        console.error("Silme işlemi başarısız: ", error);
        showModal('Silme işlemi başarısız oldu.');
    } finally {
        hideSpinner();
    }
};

const deleteAnimeAndEpisodes = async (animeId) => {
    showSpinner();
    try {
        const batch = db.batch();
        const episodesSnapshot = await db.collection('episodes').where('animeId', '==', animeId).get();
        episodesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        batch.delete(db.collection('animes').doc(animeId));
        await batch.commit();
        showModal('Anime ve tüm bölümleri başarıyla silindi!');
        renderAnimes();
        showView('animes-view');
    } catch (error) {
        console.error("Anime ve bölümler silinirken hata oluştu: ", error);
        showModal('Silme işlemi başarısız oldu.');
    } finally {
        hideSpinner();
    }
};

const editData = (collection, id, data) => {
    isEditing = true;
    currentEditId = id;
    
    if (collection === 'animes') {
        showView('create-anime-view');
        animeForm.name.value = data.name;
        animeForm.description.value = data.description;
        animeForm.imdb.value = data.imdbUrl || '';
        animeForm.imageUrl.value = data.imageUrl;
        animeForm.genres.value = (data.genres || []).join(', ');
        animeForm.submitBtn.textContent = 'Animeyi Güncelle';
    } else if (collection === 'episodes') {
        showView('create-episode-view');
        populateAnimeSelect(data.animeId);
        episodeForm.season.value = data.season || '';
        episodeForm.number.value = data.number;
        episodeForm.duration.value = data.duration || '';
        episodeForm.rating.value = data.rating || '';
        episodeForm.translator.value = data.translator || '';
        episodeForm.encoder.value = data.encoder || '';
        episodeForm.uploader.value = data.uploader || '';
        episodeForm.links.value = data.links.join('\n');
        episodeForm.submitBtn.textContent = 'Bölümü Güncelle';
    }
};

elements.createAnimeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner();
    const name = animeForm.name.value.trim();
    const description = animeForm.description.value;
    const imdbUrl = animeForm.imdb.value;
    const imageUrl = animeForm.imageUrl.value;
    const genres = animeForm.genres.value.split(',').map(g => g.trim()).filter(g => g);
    
    if (!isEditing) {
        const existingAnime = await db.collection('animes').where('name', '==', name).get();
        if (!existingAnime.empty) {
            showModal('Bu anime adı zaten mevcut. Lütfen farklı bir isim kullanın.');
            hideSpinner();
            return;
        }
    }
    
    const animeData = { name, description, imdbUrl, imageUrl, genres };

    try {
        if (isEditing) {
            await db.collection('animes').doc(currentEditId).update(animeData);
            showModal('Anime başarıyla güncellendi!');
        } else {
            await db.collection('animes').add({
                ...animeData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showModal('Anime başarıyla eklendi!');
        }
        elements.createAnimeForm.reset();
        isEditing = false;
        currentEditId = null;
        animeForm.submitBtn.textContent = 'Animeyi Kaydet';
        renderAnimes();
        showView('animes-view');
    } catch (error) {
        console.error("İşlem başarısız: ", error);
        showModal('İşlem sırasında bir hata oluştu.');
    } finally {
        hideSpinner();
    }
});

elements.createEpisodeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner();
    const animeId = episodeForm.animeId.value;
    const season = parseInt(episodeForm.season.value) || 1;
    const number = parseInt(episodeForm.number.value);
    const duration = episodeForm.duration.value;
    const rating = parseFloat(episodeForm.rating.value) || null;
    const translator = episodeForm.translator.value;
    const encoder = episodeForm.encoder.value;
    const uploader = episodeForm.uploader.value;
    const links = episodeForm.links.value.split('\n').filter(link => link.trim() !== '');
    
    if (!isEditing) {
        const existingEpisode = await db.collection('episodes')
            .where('animeId', '==', animeId)
            .where('season', '==', season)
            .where('number', '==', number)
            .get();

        if (!existingEpisode.empty) {
            showModal('Bu anime için bu sezon ve bölüm numarası zaten mevcut.');
            hideSpinner();
            return;
        }
    }
    
    const episodeData = { animeId, season, number, duration, rating, translator, encoder, uploader, links };

    try {
        if (isEditing) {
            await db.collection('episodes').doc(currentEditId).update(episodeData);
            showModal('Bölüm başarıyla güncellendi!');
        } else {
            await db.collection('episodes').add({
                ...episodeData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const animeDoc = await db.collection('animes').doc(animeId).get();
            const animeData = animeDoc.data();
            await sendDiscordNotification(animeData, episodeData);
            showModal('Bölüm başarıyla eklendi ve bildirim gönderildi!');
        }
