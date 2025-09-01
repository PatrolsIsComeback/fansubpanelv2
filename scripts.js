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

// DOM elemanlarını tek bir nesnede toplamak, kodun okunabilirliğini artırır.
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
    // Form elemanları
    animeForm: {
        name: document.getElementById('anime-name'),
        description: document.getElementById('anime-description'),
        imdb: document.getElementById('anime-imdb'),
        imageUrl: document.getElementById('anime-image-url'),
        genres: document.getElementById('anime-genres'),
        submitBtn: document.querySelector('#create-anime-form button')
    },
    episodeForm: {
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
    }
};

let isEditing = false;
let currentEditId = null;
let lastVisibleAnime = null;
let currentUser = null;

// Helper fonksiyonlar
const showModal = (message) => {
    elements.modalMessage.textContent = message;
    elements.customModal.classList.remove('hidden');
};

const hideModal = () => {
    elements.modalOkButton.onclick = null;
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

const showSpinner = () => elements.loadingSpinner.classList.remove('hidden');
const hideSpinner = () => elements.loadingSpinner.classList.add('hidden');

const getLinkHost = (url) => {
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.split('.');
        return parts.length > 1 ? parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1) : hostname;
    } catch (e) {
        return 'Geçersiz Link';
    }
};

// Veri renderlama fonksiyonları
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
        const snapshot = await db.collection('episodes').orderBy('createdAt', 'desc').limit(20).get();
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
        const snapshot = await db.collection('episodes').where('animeId', '==', animeId).orderBy('number', 'asc').get();
        snapshot.forEach(doc => {
            const card = createEpisodeCard(doc.id, doc.data());
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

// Veri işlemleri
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
        episodesSnapshot.forEach(doc => batch.delete(doc.ref));
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
        elements.animeForm.name.value = data.name;
        elements.animeForm.description.value = data.description;
        elements.animeForm.imdb.value = data.imdbUrl || '';
        elements.animeForm.imageUrl.value = data.imageUrl;
        elements.animeForm.genres.value = (data.genres || []).join(', ');
        elements.animeForm.submitBtn.textContent = 'Animeyi Güncelle';
    } else if (collection === 'episodes') {
        showView('create-episode-view');
        populateAnimeSelect(data.animeId);
        elements.episodeForm.season.value = data.season || '';
        elements.episodeForm.number.value = data.number;
        elements.episodeForm.duration.value = data.duration || '';
        elements.episodeForm.rating.value = data.rating || '';
        elements.episodeForm.translator.value = data.translator || '';
        elements.episodeForm.encoder.value = data.encoder || '';
        elements.episodeForm.uploader.value = data.uploader || '';
        elements.episodeForm.links.value = data.links.join('\n');
        elements.episodeForm.submitBtn.textContent = 'Bölümü Güncelle';
    }
};

elements.createAnimeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner();
    const { name, description, imdb, imageUrl, genres, submitBtn } = elements.animeForm;
    const animeData = {
        name: name.value.trim(),
        description: description.value,
        imdbUrl: imdb.value,
        imageUrl: imageUrl.value,
        genres: genres.value.split(',').map(g => g.trim()).filter(g => g)
    };
    try {
        if (!isEditing) {
            const existingAnime = await db.collection('animes').where('name', '==', animeData.name).get();
            if (!existingAnime.empty) {
                showModal('Bu anime adı zaten mevcut. Lütfen farklı bir isim kullanın.');
                hideSpinner();
                return;
            }
            await db.collection('animes').add({ ...animeData, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            showModal('Anime başarıyla eklendi!');
        } else {
            await db.collection('animes').doc(currentEditId).update(animeData);
            showModal('Anime başarıyla güncellendi!');
        }
        elements.createAnimeForm.reset();
        isEditing = false;
        currentEditId = null;
        submitBtn.textContent = 'Animeyi Kaydet';
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
    const { animeId, season, number, duration, rating, translator, encoder, uploader, links, submitBtn } = elements.episodeForm;
    const episodeData = {
        animeId: animeId.value,
        season: parseInt(season.value) || 1,
        number: parseInt(number.value),
        duration: duration.value,
        rating: parseFloat(rating.value) || null,
        translator: translator.value,
        encoder: encoder.value,
        uploader: uploader.value,
        links: links.value.split('\n').filter(link => link.trim() !== '')
    };
    try {
        if (!isEditing) {
            const existingEpisode = await db.collection('episodes')
                .where('animeId', '==', episodeData.animeId)
                .where('season', '==', episodeData.season)
                .where('number', '==', episodeData.number)
                .get();
            if (!existingEpisode.empty) {
                showModal('Bu anime için bu sezon ve bölüm numarası zaten mevcut.');
                hideSpinner();
                return;
            }
            await db.collection('episodes').add({ ...episodeData, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            const animeDoc = await db.collection('animes').doc(episodeData.animeId).get();
            if (animeDoc.exists) {
                await sendDiscordNotification(animeDoc.data(), episodeData);
            }
            showModal('Bölüm başarıyla eklendi ve bildirim gönderildi!');
        } else {
            await db.collection('episodes').doc(currentEditId).update(episodeData);
            showModal('Bölüm başarıyla güncellendi!');
        }
        elements.createEpisodeForm.reset();
        isEditing = false;
        currentEditId = null;
        submitBtn.textContent = 'Bölümü Kaydet ve Bildirim Gönder';
        renderEpisodes();
        showView('episodes-view');
    } catch (error) {
        console.error("İşlem başarısız: ", error);
        showModal('İşlem sırasında bir hata oluştu.');
    } finally {
        hideSpinner();
    }
});

const sendDiscordNotification = async (animeData, episodeData) => {
    // Webhook URL'in geçerliliğini kontrol et
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("YOUR_WEBHOOK_ID")) {
        console.warn("Discord Webhook URL tanımlanmamış. Bildirim gönderilemedi.");
        return;
    }
    const fields = [
        { name: "Sezon", value: `${episodeData.season}`, inline: true },
        { name: "Bölüm No", value: `${episodeData.number}`, inline: true },
    ];
    if (episodeData.duration) fields.push({ name: "Bölüm Süresi", value: episodeData.duration, inline: true });
    if (episodeData.translator) fields.push({ name: "Çevirmen", value: episodeData.translator, inline: true });
    if (episodeData.encoder) fields.push({ name: "Encoder", value: episodeData.encoder, inline: true });
    if (episodeData.uploader) fields.push({ name: "Uploader", value: episodeData.uploader, inline: true });
    fields.push({ name: "İzleme Linkleri", value: episodeData.links.map(link => `[${getLinkHost(link)}](${link})`).join('\n') || "Belirtilmemiş" });

    const payload = {
        embeds: [{
            title: `${animeData.name} ${episodeData.number}. Bölüm Çıktı! 🎉`,
            description: `Yeni bölüm yayında!`,
            color: 638681, 
            fields: fields,
            thumbnail: { url: animeData.imageUrl },
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
            console.error(`Discord Webhook hatası: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error("Discord'a bildirim gönderilirken bir hata oluştu: ", error);
    }
};

const populateAnimeSelect = async (selectedId = null) => {
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
        console.error("Anime seçme listesi yüklenirken hata oluştu: ", error);
    }
};

// Kayıt isteklerini yönetme
const renderRequests = async () => {
    showSpinner();
    elements.requestsList.innerHTML = '';
    try {
        const snapshot = await db.collection('registrationRequests').where('status', '==', 'pending').get();
        snapshot.forEach(doc => {
            const request = doc.data();
            const card = document.createElement('div');
            card.classList.add('request-card');
            card.innerHTML = `
                <div class="request-info">
                    <h4>${request.discordName}</h4>
                    <p>${request.email}</p>
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
    } catch (error) {
        console.error("Kayıt istekleri yüklenirken hata oluştu: ", error);
    } finally {
        hideSpinner();
    }
};

const acceptRequest = async (requestId, uid, email, discordName) => {
    showSpinner();
    try {
        await db.collection('users').doc(uid).set({
            email: email,
            discordName: discordName,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('registrationRequests').doc(requestId).delete();
        showModal(`Kayıt isteği başarıyla onaylandı. ${discordName} artık giriş yapabilir.`);
        renderRequests();
    } catch (error) {
        console.error("Kayıt isteği onaylanırken hata oluştu: ", error);
        showModal("Kayıt isteği onaylanırken bir hata oluştu.");
    } finally {
        hideSpinner();
    }
};

const rejectRequest = async (requestId, email) => {
    showSpinner();
    try {
        await db.collection('registrationRequests').doc(requestId).delete();
        showModal(`Kayıt isteği başarıyla reddedildi. ${email} kullanıcısı tekrar deneyemez.`);
        renderRequests();
    } catch (error) {
        console.error("Kayıt isteği reddedilirken hata oluştu: ", error);
        showModal("Kayıt isteği reddedilirken bir hata oluştu.");
    } finally {
        hideSpinner();
    }
};

// --- Olay Dinleyicileri ---
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
    showSpinner();
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Giriş işlemi başarısız: ", error);
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
    showSpinner();
    try {
        const existingRequest = await db.collection('registrationRequests').where('email', '==', email).get();
        if (!existingRequest.empty) {
            showModal('Bu e-posta adresi için zaten bir kayıt isteği bulunmaktadır.');
            hideSpinner();
            return;
        }
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await auth.signOut();
        await db.collection('registrationRequests').doc(user.uid).set({
            uid: user.uid,
            email: email,
            discordName: discordName,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showModal('Kayıt isteğiniz başarıyla gönderildi. Yönetici onayı bekleniyor.');
    } catch (error) {
        console.error("Kayıt işlemi başarısız: ", error);
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
    showSpinner();
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Çıkış işlemi başarısız: ", error);
        showModal('Çıkış işlemi sırasında bir hata oluştu.');
    } finally {
        hideSpinner();
    }
});

elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = item.dataset.view;
        showView(viewId);
        switch (viewId) {
            case 'animes-view':
                renderAnimes();
                break;
            case 'episodes-view':
                renderEpisodes();
                break;
            case 'create-episode-view':
                populateAnimeSelect();
                isEditing = false;
                currentEditId = null;
                elements.createEpisodeForm.reset();
                elements.episodeForm.submitBtn.textContent = 'Bölümü Kaydet ve Bildirim Gönder';
                break;
            case 'create-anime-view':
                isEditing = false;
                currentEditId = null;
                elements.createAnimeForm.reset();
                elements.animeForm.submitBtn.textContent = 'Animeyi Kaydet';
                break;
            case 'requests-view':
                renderRequests();
                break;
            default:
                break;
        }
    });
});

elements.backToAnimesButton.addEventListener('click', () => {
    showView('animes-view');
    renderAnimes();
});

elements.loadMoreAnimesButton.addEventListener('click', () => renderAnimes(true));

// Oturum kontrolü
auth.onAuthStateChanged(async (user) => {
    showSpinner();
    if (user) {
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
            const activeNavItem = document.querySelector('.nav
