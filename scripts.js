document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
        apiKey: "AIzaSyCpcXdVwJv3LUN8YVknQQBXk9jCw2BeKXo",
        authDomain: "somesubspanel.firebaseapp.com",
        projectId: "somesubspanel",
        storageBucket: "somesubspanel.firebasestorage.app",
        messagingSenderId: "1084301012165",
        appId: "1:1084301012165:web:29c773daea44b35f8f54ac",
        measurementId: "G-BBLN91Q0TV"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Discord Webhook URL'ini buraya yapıştır
    const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN';

    const elements = {
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
        backToAnimesButton: document.getElementById('back-to-animes')
    };

    const showView = (id) => {
        elements.views.forEach(view => view.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        elements.navItems.forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[href="#${id.replace('-view', '')}"]`);
        if (navItem) navItem.classList.add('active');
    };

    const showSpinner = () => {
        elements.loadingSpinner.classList.remove('hidden');
    };

    const hideSpinner = () => {
        elements.loadingSpinner.classList.add('hidden');
    };

    const renderAnimes = async () => {
        showSpinner();
        elements.animesList.innerHTML = '';
        try {
            const snapshot = await db.collection('animes').orderBy('name').get();
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
                <button class="edit-button" data-id="${animeId}" data-type="anime"><img src="https://www.svgrepo.com/show/440507/edit.svg" alt="Düzenle" style="filter: invert(1); width:20px;"></button>
                <button class="delete-button" data-id="${animeId}" data-type="anime"><img src="https://www.svgrepo.com/show/440520/trash.svg" alt="Sil" style="filter: invert(1); width:20px;"></button>
            </div>
        `;

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
            <h4 class="episode-number">${episodeData.number}. Bölüm</h4>
            ${animeData ? `<p><b>Anime:</b> ${animeData.name}</p>` : ''}
            <div class="episode-meta">
                ${episodeData.rating ? `<span><b>Puan:</b> ${episodeData.rating}</span>` : ''}
                ${episodeData.translator ? `<span><b>Çevirmen:</b> ${episodeData.translator}</span>` : ''}
                ${episodeData.encoder ? `<span><b>Encoder:</b> ${episodeData.encoder}</span>` : ''}
                ${episodeData.uploader ? `<span><b>Uploader:</b> ${episodeData.uploader}</span>` : ''}
            </div>
            <ul class="links-list">
                ${episodeData.links.map(link => `<li><a href="${link}" target="_blank">${new URL(link).hostname}</a></li>`).join('')}
            </ul>
            <button class="edit-button" data-id="${episodeId}" data-type="episode"><img src="https://www.svgrepo.com/show/440507/edit.svg" alt="Düzenle" style="filter: invert(1); width:20px;"></button>
            <button class="delete-button" data-id="${episodeId}" data-type="episode"><img src="https://www.svgrepo.com/show/440520/trash.svg" alt="Sil" style="filter: invert(1); width:20px;"></button>
        `;

        card.querySelector('.delete-button').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Bu bölümü silmek istediğinize emin misiniz?')) {
                deleteData('episodes', episodeId);
            }
        });

        // Edit button functionality to be implemented

        return card;
    };

    const deleteData = async (collection, id) => {
        try {
            await db.collection(collection).doc(id).delete();
            alert('Başarıyla silindi!');
            if (collection === 'animes') {
                renderAnimes();
                showView('animes-view');
            } else {
                renderEpisodes();
                showView('episodes-view');
            }
        } catch (error) {
            console.error("Silme işlemi başarısız: ", error);
            alert('Silme işlemi başarısız oldu.');
        }
    };

    elements.createAnimeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showSpinner();
        const name = document.getElementById('anime-name').value;
        const description = document.getElementById('anime-description').value;
        const imdbUrl = document.getElementById('anime-imdb').value;
        const imageUrl = document.getElementById('anime-image-url').value;
        const genres = document.getElementById('anime-genres').value.split(',').map(g => g.trim());

        try {
            await db.collection('animes').add({
                name,
                description,
                imdbUrl,
                imageUrl,
                genres,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Anime başarıyla eklendi!');
            elements.createAnimeForm.reset();
            renderAnimes();
            showView('animes-view');
        } catch (error) {
            console.error("Anime eklenirken hata oluştu: ", error);
            alert('Anime eklenirken bir hata oluştu.');
        } finally {
            hideSpinner();
        }
    });

    elements.createEpisodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showSpinner();
        const animeId = document.getElementById('episode-anime-select').value;
        const number = parseInt(document.getElementById('episode-number').value);
        const rating = parseFloat(document.getElementById('episode-rating').value);
        const translator = document.getElementById('episode-translator').value;
        const encoder = document.getElementById('episode-encoder').value;
        const uploader = document.getElementById('episode-uploader').value;
        const links = document.getElementById('episode-links').value.split('\n').filter(link => link.trim() !== '');

        // Bölüm numarası kontrolü
        const existingEpisode = await db.collection('episodes')
            .where('animeId', '==', animeId)
            .where('number', '==', number)
            .get();

        if (!existingEpisode.empty) {
            alert('Bu anime için bu bölüm numarası zaten mevcut.');
            hideSpinner();
            return;
        }

        try {
            const docRef = await db.collection('episodes').add({
                animeId,
                number,
                rating,
                translator,
                encoder,
                uploader,
                links,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const animeDoc = await db.collection('animes').doc(animeId).get();
            const animeName = animeDoc.data().name;

            // Discord Webhook bildirimi
            await sendDiscordNotification(animeName, number, links, translator, encoder, uploader);

            alert('Bölüm başarıyla eklendi ve bildirim gönderildi!');
            elements.createEpisodeForm.reset();
            renderEpisodes();
            showView('episodes-view');
        } catch (error) {
            console.error("Bölüm eklenirken hata oluştu: ", error);
            alert('Bölüm eklenirken bir hata oluştu.');
        } finally {
            hideSpinner();
        }
    });

    const sendDiscordNotification = async (animeName, episodeNumber, links, translator, encoder, uploader) => {
        if (!DISCORD_WEBHOOK_URL) {
            console.warn("Discord Webhook URL tanımlanmamış. Bildirim gönderilemedi.");
            return;
        }

        const payload = {
            embeds: [{
                title: `${animeName} ${episodeNumber}. Bölüm Çıktı! 🎉`,
                description: `Yeni bölüm yayında!`,
                color: 638681, // Kırmızımsı-mor renk
                fields: [
                    { name: "Çevirmen", value: translator || "Belirtilmemiş", inline: true },
                    { name: "Encoder", value: encoder || "Belirtilmemiş", inline: true },
                    { name: "Uploader", value: uploader || "Belirtilmemiş", inline: true },
                    { name: "İzleme Linkleri", value: links.map(link => `[${new URL(link).hostname}](${link})`).join('\n') || "Belirtilmemiş" }
                ],
                timestamp: new Date().toISOString()
            }]
        };

        try {
            const response = await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error(`Discord Webhook hatası: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            console.error("Discord'a bildirim gönderilirken bir hata oluştu: ", error);
        }
    };

    const populateAnimeSelect = async () => {
        elements.animeSelect.innerHTML = '<option value="">-- Anime Seçin --</option>';
        try {
            const snapshot = await db.collection('animes').orderBy('name').get();
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                elements.animeSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Anime seçme listesi yüklenirken hata oluştu: ", error);
        }
    };
    
    // Olay Dinleyicileri
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('href').substring(1) + '-view';
            showView(viewId);
            if (viewId === 'animes-view') {
                renderAnimes();
            } else if (viewId === 'episodes-view') {
                renderEpisodes();
            } else if (viewId === 'create-episode-view') {
                populateAnimeSelect();
            }
        });
    });

    elements.backToAnimesButton.addEventListener('click', () => {
        showView('animes-view');
        renderAnimes();
    });

    // Başlangıçta animeleri yükle
    renderAnimes();
    showView('animes-view');
});
