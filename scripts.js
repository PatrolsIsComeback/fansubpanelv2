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

// YENİ VE GEÇERLİ DISCORD WEBHOOK URL'İNİZİ BURAYA YAPIŞTIRIN
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1412502625534087238/KKe5swSsdna6057TD3nK0bhfCh1T1mzSkO1ELW7DMvHC0ZjWE04gz6Ckhza2W1_TEw2v';

// Firebase ve Firestore'u başlat
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

// --- Yardımcı: SVG ikonları (inline) ---
const ICONS = {
    edit: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
      <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
    </svg>`,
    trash: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M6 7h12v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7z"/>
      <path d="M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z"/>
      <path d="M4 7h16v2H4z"/>
    </svg>`
};

// Tüm DOM elemanlarını tek bir nesnede toplamak daha düzenlidir.
const elements = {
    authView: document.getElementById('auth-view'),
    mainApp: document.getElementById('main-app'),
    views: document.querySelectorAll('.view'),
    navItems: document.querySelectorAll('.nav-item'),
    loadingSpinner: document.getElementById('loading-spinner'),
    loadingText: document.querySelector('.loading-text'),
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
    customModal: document.getElementById('custom-modal'),
    modalMessage: document.getElementById('modal-message'),
    modalOkButton: document.getElementById('modal-ok-button'),
    animeSearchInput: document.getElementById('anime-search'),
    searchMeta: document.getElementById('search-meta') // sonuç sayısı/filtre bilgisi için opsiyonel bir alan
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
let currentSearchQuery = '';
let searchDebounce = null;

// --- GENEL AMAÇLI YARDIMCI FONKSİYONLAR ---
const escapeHTML = (str = '') => str.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

const showModal = (message) => {
    elements.modalMessage.textContent = message;
    elements.customModal.classList.remove('hidden');
};

const hideModal = () => {
    elements.customModal.classList.add('hidden');
};

const showView = (id) => {
    elements.views.forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });
    const activeView = document.getElementById(id);
    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.classList.add('active');
    }

    elements.navItems.forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`[data-view="${id}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
};

const showSpinner = (text = 'Veriler yükleniyor...') => {
    elements.loadingSpinner.style.display = 'flex';
    elements.loadingSpinner.style.position = 'fixed';
    elements.loadingSpinner.style.top = '0';
    elements.loadingSpinner.style.left = '0';
    elements.loadingSpinner.style.width = '100%';
    elements.loadingSpinner.style.height = '100%';
    elements.loadingSpinner.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    elements.loadingSpinner.style.justifyContent = 'center';
    elements.loadingSpinner.style.alignItems = 'center';
    elements.loadingSpinner.style.zIndex = '9999';

    elements.loadingText.textContent = text;
    elements.loadingSpinner.classList.remove('hidden');
};

const hideSpinner = () => {
    elements.loadingSpinner.style.display = 'none';
    elements.loadingSpinner.classList.add('hidden');
};

const getLinkHost = (url) => {
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.split('.');
        if (parts.length > 1) {
            const hostPart = parts[parts.length - 2];
            return hostPart.charAt(0).toUpperCase() + hostPart.slice(1);
        }
        return hostname;
    } catch (e) {
        return 'Geçersiz Link';
    }
};

const sanitizeUrl = (raw) => {
    try {
        const url = new URL(raw.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url.toString();
    } catch (e) {
        return null;
    }
};

// --- CRUD VE GÖRÜNÜM FONKSİYONLARI ---

const renderAnimes = async (loadMore = false, searchQuery = '') => {
    showSpinner(searchQuery ? `"${searchQuery}" için aranıyor...` : 'Animeler yükleniyor...');

    if (!loadMore) {
        elements.animesList.innerHTML = '';
        lastVisibleAnime = null;
        elements.loadMoreAnimesButton.classList.add('hidden');
    }

    let query = db.collection('animes').orderBy('name');
    if (searchQuery) {
        // prefix araması
        query = query.where('name', '>=', searchQuery).where('name', '<=', searchQuery + '\uf8ff');
    }

    query = query.limit(12);
    if (lastVisibleAnime && !searchQuery) {
        query = query.startAfter(lastVisibleAnime);
    }

    try {
        const snapshot = await query.get();
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const fragment = document.createDocumentFragment();

        if (snapshot.empty && !loadMore) {
            elements.animesList.innerHTML = `<p class="text-center text-gray-500">${searchQuery ? 'Aradığınız anime bulunamadı.' : 'Henüz anime bulunmamaktadır.'}</p>`;
            elements.searchMeta && (elements.searchMeta.textContent = '');
        } else {
            elements.searchMeta && (elements.searchMeta.textContent = searchQuery ? `${snapshot.size} sonuç` : '');
        }

        snapshot.forEach(doc => {
            const anime = doc.data();
            const card = document.createElement('div');
            card.classList.add('card');
            card.setAttribute('tabindex', '0');
            card.innerHTML = `
                <img src="${escapeHTML(anime.imageUrl || '')}" alt="${escapeHTML(anime.name || 'Anime')}
                " class="card-image" onerror="this.src='';this.classList.add('image-fallback')">
                <div class="card-content">
                    <h3 class="card-title">${escapeHTML(anime.name)}</h3>
                    <p class="card-description">${escapeHTML(anime.description || '')}</p>
                </div>
            `;
            card.addEventListener('click', () => showAnimeDetail(doc.id, anime));
            card.addEventListener('keypress', (e) => { if (e.key === 'Enter') showAnimeDetail(doc.id, anime); });
            fragment.appendChild(card);
        });

        elements.animesList.appendChild(fragment);

        if (lastDoc && !searchQuery) {
            lastVisibleAnime = lastDoc;
            elements.loadMoreAnimesButton.classList.remove('hidden');
        } else {
            elements.loadMoreAnimesButton.classList.add('hidden');
        }
    } catch (error) {
        console.error('Animeler yüklenirken hata oluştu: ', error);
        showModal('Animeler yüklenirken bir sorun oluştu.');
    } finally {
        hideSpinner();
    }
};

const renderEpisodes = async () => {
    showSpinner('Bölümler yükleniyor...');
    elements.episodesList.innerHTML = '';

    try {
        const episodesSnapshot = await db.collection('episodes').orderBy('createdAt', 'desc').get();
        if (episodesSnapshot.empty) {
            elements.episodesList.innerHTML = '<p class="text-center text-gray-500">Henüz bölüm bulunmamaktadır.</p>';
            hideSpinner();
            return;
        }

        const episodes = episodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const uniqueAnimeIds = new Set(episodes.map(episode => episode.animeId));
        const animeDataMap = {};
        if (uniqueAnimeIds.size > 0) {
            const animePromises = Array.from(uniqueAnimeIds).map(id => db.collection('animes').doc(id).get());
            const animeSnapshots = await Promise.all(animePromises);
            animeSnapshots.forEach(doc => {
                if (doc.exists) {
                    animeDataMap[doc.id] = doc.data();
                }
            });
        }

        const fragment = document.createDocumentFragment();
        episodes.forEach(episode => {
            const animeData = animeDataMap[episode.animeId];
            if (animeData) {
                const card = createEpisodeCard(episode.id, episode, animeData);
                fragment.appendChild(card);
            }
        });

        elements.episodesList.appendChild(fragment);

    } catch (error) {
        console.error('Bölümler yüklenirken hata oluştu: ', error);
        showModal('Bölümler yüklenirken bir sorun oluştu.');
    } finally {
        hideSpinner();
    }
};

const showAnimeDetail = async (animeId, animeData) => {
    showSpinner('Anime detayları yükleniyor...');
    elements.animeDetailCard.innerHTML = `
        <img src="${escapeHTML(animeData.imageUrl || '')}" alt="${escapeHTML(animeData.name || 'Anime')}" class="detail-image" onerror="this.src='';this.classList.add('image-fallback')">
        <div class="detail-content">
            <h2 class="detail-title">${escapeHTML(animeData.name)}</h2>
            <p class="detail-description">${escapeHTML(animeData.description || '')}</p>
            ${animeData.imdbUrl ? `<p class="info-item"><b>IMDb:</b> <a href="${escapeHTML(animeData.imdbUrl)}" target="_blank" rel="noopener">${escapeHTML(animeData.imdbUrl)}</a></p>` : ''}
            ${animeData.genres && animeData.genres.length > 0 ? `<p class="info-item"><b>Türler:</b> ${animeData.genres.map(escapeHTML).join(', ')}</p>` : ''}
            <div class="actions-row">
              <button class="edit-button" data-id="${animeId}" data-type="anime" aria-label="Animeyi Düzenle">${ICONS.edit}</button>
              <button class="delete-button" data-id="${animeId}" data-type="anime" aria-label="Animeyi Sil">${ICONS.trash}</button>
            </div>
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

        const fragment = document.createDocumentFragment();
        snapshot.forEach(doc => {
            const episode = doc.data();
            const card = createEpisodeCard(doc.id, episode);
            fragment.appendChild(card);
        });
        elements.animeEpisodesList.appendChild(fragment);

    } catch (error) {
        console.error('Anime bölümleri yüklenirken hata oluştu: ', error);
        showModal('Bölümler yüklenirken bir sorun oluştu.');
    } finally {
        hideSpinner();
    }
    showView('anime-detail-view');
};

const createEpisodeCard = (episodeId, episodeData, animeData = null) => {
    const card = document.createElement('div');
    card.classList.add('episode-card');

    const safeLinks = (episodeData.links || [])
      .map(sanitizeUrl)
      .filter(Boolean);

    const linksHtml = safeLinks.map(link => {
        const host = getLinkHost(link);
        return `<li><a href="${link}" target="_blank" rel="noopener" class="link-item">${escapeHTML(host)}</a></li>`;
    }).join('');

    card.innerHTML = `
        <h4 class="episode-number">${episodeData.season || 1}. Sezon - ${episodeData.number}. Bölüm</h4>
        ${animeData ? `<p><b>Anime:</b> ${escapeHTML(animeData.name)}</p>` : ''}
        <div class="episode-meta">
            ${episodeData.duration ? `<span><b>Süre:</b> ${escapeHTML(episodeData.duration)}</span>` : ''}
            ${episodeData.rating ? `<span><b>Puan:</b> ${escapeHTML(String(episodeData.rating))}</span>` : ''}
            ${episodeData.translator ? `<span><b>Çevirmen:</b> ${escapeHTML(episodeData.translator)}</span>` : ''}
            ${episodeData.encoder ? `<span><b>Encoder:</b> ${escapeHTML(episodeData.encoder)}</span>` : ''}
            ${episodeData.uploader ? `<span><b>Uploader:</b> ${escapeHTML(episodeData.uploader)}</span>` : ''}
        </div>
        <ul class="links-list">${linksHtml || '<li>Link yok</li>'}</ul>
        <div class="episode-actions">
            <button class="edit-button" data-id="${episodeId}" data-type="episode" aria-label="Bölümü Düzenle">${ICONS.edit}</button>
            <button class="delete-button" data-id="${episodeId}" data-type="episode" aria-label="Bölümü Sil">${ICONS.trash}</button>
        </div>
    `;

    card.querySelector('.edit-button').addEventListener('click', (e) => {
        e.stopPropagation();
        editData('episodes', episodeId, { ...episodeData, links: safeLinks });
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
    showSpinner('Siliniyor...');
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
                } else {
                    renderAnimes();
                    showView('animes-view');
                }
            } else {
                renderEpisodes();
                showView('episodes-view');
            }
        }
    } catch (error) {
        console.error('Silme işlemi başarısız: ', error);
        showModal('Silme işlemi başarısız oldu.');
    } finally {
        hideSpinner();
    }
};

const deleteAnimeAndEpisodes = async (animeId) => {
    showSpinner('Anime ve bölümleri siliniyor...');
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
        console.error('Anime ve bölümler silinirken hata oluştu: ', error);
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
        animeForm.name.value = data.name || '';
        animeForm.description.value = data.description || '';
        animeForm.imdb.value = data.imdbUrl || '';
        animeForm.imageUrl.value = data.imageUrl || '';
        animeForm.genres.value = (data.genres || []).join(', ');
        animeForm.submitBtn.textContent = 'Animeyi Güncelle';
    } else if (collection === 'episodes') {
        showView('create-episode-view');
        populateAnimeSelect(data.animeId);
        episodeForm.season.value = data.season || '';
        episodeForm.number.value = data.number || '';
        episodeForm.duration.value = data.duration || '';
        episodeForm.rating.value = data.rating || '';
        episodeForm.translator.value = data.translator || '';
        episodeForm.encoder.value = data.encoder || '';
        episodeForm.uploader.value = data.uploader || '';
        episodeForm.links.value = (data.links || []).join('\n');
        episodeForm.submitBtn.textContent = 'Bölümü Güncelle';
    }
};

const handleAnimeSubmit = async (e) => {
    e.preventDefault();
    showSpinner('Anime kaydediliyor...');
    const name = animeForm.name.value.trim();
    const description = animeForm.description.value.trim();
    const imdbUrl = animeForm.imdb.value.trim();
    const imageUrl = animeForm.imageUrl.value.trim();
    const genres = animeForm.genres.value.split(',').map(g => g.trim()).filter(g => g);

    if (!name || !description || !imageUrl) {
        showModal('Lütfen tüm zorunlu alanları doldurun: İsim, Açıklama ve Resim URL.');
        hideSpinner();
        return;
    }

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
        renderAnimes(false, currentSearchQuery);
        showView('animes-view');
    } catch (error) {
        console.error('İşlem başarısız: ', error);
        showModal('İşlem sırasında bir hata oluştu.');
    } finally {
        hideSpinner();
    }
};

const handleEpisodeSubmit = async (e) => {
    e.preventDefault();
    showSpinner('Bölüm kaydediliyor...');
    const animeId = episodeForm.animeId.value;
    const season = parseInt(episodeForm.season.value) || 1;
    const number = parseInt(episodeForm.number.value);
    const duration = episodeForm.duration.value.trim();
    const rating = episodeForm.rating.value ? (parseFloat(episodeForm.rating.value) || null) : null;
    const translator = episodeForm.translator.value.trim();
    const encoder = episodeForm.encoder.value.trim();
    const uploader = episodeForm.uploader.value.trim();
    const links = episodeForm.links.value.split('\n')
        .map(sanitizeUrl)
        .filter(Boolean);

    if (!animeId || !number || links.length === 0) {
        showModal('Lütfen tüm zorunlu alanları doldurun: Anime, Bölüm Numarası ve Linkler.');
        hideSpinner();
        return;
    }

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
            const docRef = await db.collection('episodes').add({
                ...episodeData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const animeDoc = await db.collection('animes').doc(animeId).get();
            const animeData = animeDoc.data();
            await sendDiscordNotification(animeData, episodeData);
            showModal('Bölüm başarıyla eklendi ve bildirim gönderildi!');
        }
        elements.createEpisodeForm.reset();
        isEditing = false;
        currentEditId = null;
        episodeForm.submitBtn.textContent = 'Bölümü Kaydet ve Bildirim Gönder';
        renderEpisodes();
        showView('episodes-view');
    } catch (error) {
        console.error('İşlem başarısız: ', error);
        showModal('İşlem sırasında bir hata oluştu.');
    } finally {
        hideSpinner();
    }
};

const sendDiscordNotification = async (animeData, episodeData) => {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.length === 0) {
        console.warn('Discord Webhook URL tanımlanmamış. Bildirim gönderilemedi.');
        return;
    }

    const fields = [
        { name: 'Sezon', value: `${episodeData.season}`, inline: true },
        { name: 'Bölüm No', value: `${episodeData.number}`, inline: true },
    ];
    if (episodeData.duration) fields.push({ name: 'Bölüm Süresi', value: episodeData.duration, inline: true });
    if (episodeData.translator) fields.push({ name: 'Çevirmen', value: episodeData.translator, inline: true });
    if (episodeData.encoder) fields.push({ name: 'Encoder', value: episodeData.encoder, inline: true });
    if (episodeData.uploader) fields.push({ name: 'Uploader', value: episodeData.uploader, inline: true });
    fields.push({ name: 'İzleme Linkleri', value: (episodeData.links || []).map(link => `[${getLinkHost(link)}](${link})`).join('\n') || 'Belirtilmemiş' });

    // Ekleyen kişinin adı (kayıt sırasında alınan discordName)
    const adSoyad = (currentUser && currentUser.discordName) ? currentUser.discordName : 'Bilinmiyor';
    fields.unshift({ name: 'Ekleyen', value: adSoyad, inline: true });

    const payload = {
        username: 'SomeSubs Panel',
        embeds: [{
            title: `${animeData.name} ${episodeData.number}. Bölüm Çıktı! 🎉`,
            description: `Yeni bölüm yayında!`,
            color: 638681,
            fields,
            thumbnail: { url: animeData.imageUrl || '' },
            footer: { text: 'Gönderildi: SomeSubs Panel' },
            timestamp: new Date().toISOString()
        }]
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Discord Webhook hatası: ${response.status} - ${response.statusText}`, errorText);
            showModal(`Bildirim gönderilirken bir sorun oluştu: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Discord'a bildirim gönderilirken bir hata oluştu: ", error);
        showModal('Bildirim gönderilirken bir hata oluştu. Ağ bağlantınızı kontrol edin.');
    }
};

const populateAnimeSelect = async (selectedId = null) => {
    showSpinner('Anime listesi yükleniyor...');
    elements.animeSelect.innerHTML = '<option value="">-- Anime Seçin --</option>';
    try {
        const snapshot = await db.collection('animes').orderBy('name').get();
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            if (selectedId && doc.id === selectedId) {
                option.selected = true;
            }
            elements.animeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Anime seçme listesi yüklenirken hata oluştu: ', error);
        showModal('Anime listesi yüklenirken bir sorun oluştu.');
    } finally {
        hideSpinner();
    }
};

const renderRequests = async () => {
    showSpinner('Kayıt istekleri yükleniyor...');
    elements.requestsList.innerHTML = '';
    try {
        const snapshot = await db.collection('registrationRequests').where('status', '==', 'pending').get();
        if (snapshot.empty) {
            elements.requestsList.innerHTML = '<p class="text-center text-gray-500">Bekleyen kayıt isteği bulunmamaktadır.</p>';
        } else {
            snapshot.forEach(doc => {
                const request = doc.data();
                const card = document.createElement('div');
                card.classList.add('request-card');
                card.innerHTML = `
                    <div class="request-info">
                        <h4>${escapeHTML(request.discordName || 'İsimsiz')}</h4>
                        <p>${escapeHTML(request.email || '')}</p>
                    </div>
                    <div class="request-buttons">
                        <button class="accept-btn" data-id="${doc.id}" data-uid="${request.uid}">Onayla</button>
                        <button class="reject-btn" data-id="${doc.id}">Reddet</button>
                    </div>
                `;
                card.querySelector('.accept-btn').addEventListener('click', () => acceptRequest(doc.id, request.uid, request.email, request.discordName));
                card.querySelector('.reject-btn').addEventListener('click', () => rejectRequest(doc.id, request.email));
                elements.requestsList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Kayıt istekleri yüklenirken hata oluştu: ', error);
        showModal('Kayıt istekleri yüklenirken bir sorun oluştu.');
    } finally {
        hideSpinner();
    }
};

const acceptRequest = async (requestId, uid, email, discordName) => {
    showSpinner('İstek onaylanıyor...');
    try {
        await db.collection('users').doc(uid).set({
            email: email,
            discordName: discordName,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('registrationRequests').doc(requestId).delete();
        showModal(`Kayıt isteği başarıyla onaylandı. ${escapeHTML(discordName || '')} artık giriş yapabilir.`);
        renderRequests();
    } catch (error) {
        console.error('Kayıt isteği onaylanırken hata oluştu: ', error);
        showModal('Kayıt isteği onaylanırken bir hata oluştu.');
    } finally {
        hideSpinner();
    }
};

const rejectRequest = async (requestId, email) => {
    showSpinner('İstek reddediliyor...');
    try {
        await db.collection('registrationRequests').doc(requestId).delete();
        showModal(`Kayıt isteği başarıyla reddedildi. ${escapeHTML(email || '')} kullanıcısı artık kayıt olamaz.`);
        renderRequests();
    } catch (error) {
        console.error('Kayıt isteği reddedilirken hata oluştu: ', error);
        showModal('Kayıt isteği reddedilirken bir hata oluştu.');
    } finally {
        hideSpinner();
    }
};

// --- OLAY DİNLEYİCİLERİ VE BAŞLANGIÇ AYARLARI ---
const setupEventListeners = () => {
    elements.modalOkButton.addEventListener('click', hideModal);
    elements.showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        elements.loginFormCard.classList.add('hidden');
        elements.registerFormCard.classList.remove('hidden');
    });
    elements.showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        elements.registerFormCard.classList.add('hidden');
        elements.loginFormCard.classList.remove('hidden');
    });
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        showSpinner('Giriş yapılıyor...');
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error('Giriş işlemi başarısız: ', error);
            showModal('Giriş başarısız. Lütfen e-posta ve şifrenizi kontrol edin.');
        } finally {
            hideSpinner();
        }
    });
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const repeatPassword = document.getElementById('register-password-repeat').value;
        const discordName = document.getElementById('register-discord-name').value;
        if (password !== repeatPassword) {
            showModal('Şifreler eşleşmiyor.');
            return;
        }
        showSpinner('Kayıt isteği gönderiliyor...');
        try {
            const existingRequest = await db.collection('registrationRequests').where('email', '==', email).get();
            if (!existingRequest.empty) {
                showModal('Bu e-posta adresi için zaten bir kayıt isteği bulunmaktadır.');
                hideSpinner();
                return;
            }
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await db.collection('registrationRequests').doc(user.uid).set({
                uid: user.uid,
                email: email,
                discordName: discordName,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await auth.signOut();
            showModal('Kayıt isteğiniz başarıyla gönderildi. Yönetici onayı bekleniyor.');
        } catch (error) {
            console.error('Kayıt işlemi başarısız: ', error);
            if (error.code === 'auth/email-already-in-use') {
                showModal('Bu e-posta adresi zaten kullanılıyor. Lütfen farklı bir e-posta kullanın.');
            } else {
                showModal(`Kayıt sırasında bir hata oluştu: ${error.message}`);
            }
        } finally {
            hideSpinner();
            elements.registerForm.reset();
        }
    });
    elements.logoutButton.addEventListener('click', async () => {
        showSpinner('Çıkış yapılıyor...');
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Çıkış işlemi başarısız: ', error);
            showModal('Çıkış işlemi sırasında bir hata oluştu.');
        } finally {
            hideSpinner();
        }
    });

    // Navigasyon + ilgili view yüklemeleri
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.dataset.view;
            showView(viewId);
            if (viewId === 'animes-view') {
                renderAnimes(false, currentSearchQuery);
            } else if (viewId === 'episodes-view') {
                renderEpisodes();
            } else if (viewId === 'create-episode-view') {
                populateAnimeSelect();
                isEditing = false;
                currentEditId = null;
                elements.createEpisodeForm.reset();
                episodeForm.submitBtn.textContent = 'Bölümü Kaydet ve Bildirim Gönder';
            } else if (viewId === 'create-anime-view') {
                isEditing = false;
                currentEditId = null;
                elements.createAnimeForm.reset();
                animeForm.submitBtn.textContent = 'Animeyi Kaydet';
            } else if (viewId === 'requests-view') {
                renderRequests();
            }
        });
    });

    elements.backToAnimesButton.addEventListener('click', () => {
        showView('animes-view');
        renderAnimes(false, currentSearchQuery);
    });

    elements.loadMoreAnimesButton.addEventListener('click', () => {
        renderAnimes(true, ''); // load more sadece genel listede aktif
    });

    elements.createAnimeForm.addEventListener('submit', handleAnimeSubmit);
    elements.createEpisodeForm.addEventListener('submit', handleEpisodeSubmit);

    // Arama: debounce + canlı filtre
    elements.animeSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        currentSearchQuery = q;
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            renderAnimes(false, q);
        }, 300);
    });
};

// onAuthStateChanged fonksiyonunun anonim fonksiyonu "async" olarak tanımlandı
auth.onAuthStateChanged(async (user) => {
    showSpinner('Oturum kontrol ediliyor...');

    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUser = { ...userDoc.data(), uid: user.uid };
                elements.authView.classList.add('hidden');
                elements.mainApp.classList.remove('hidden');
                if (currentUser.role === 'admin') {
                    elements.requestsNavItem.classList.remove('hidden');
                } else {
                    elements.requestsNavItem.classList.add('hidden');
                }
                renderAnimes(false, currentSearchQuery);
                showView('animes-view');
            } else {
                await auth.signOut();
                showModal('Hesabınız henüz yönetici tarafından onaylanmamıştır.');
            }
        } catch (error) {
            console.error('Kullanıcı yetkisi kontrol edilirken hata oluştu:', error);
            showModal('Giriş işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
            await auth.signOut();
        }
    } else {
        currentUser = null;
        elements.mainApp.classList.add('hidden');
        elements.authView.classList.remove('hidden');
        elements.loginFormCard.classList.remove('hidden');
        elements.registerFormCard.classList.add('hidden');
    }

    hideSpinner();
});

// Uygulama başladığında olay dinleyicilerini kur
setupEventListeners();
