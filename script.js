let siteData = null;
let totalSavedUsd = 0; 

// Унікальний ключ для CountAPI
const API_KEY = 'Hdp7B#kd&dn55'; 
const API_URL = `https://api.countapi.it`;

// --- ЛІЧИЛЬНИК ТА СИНХРОНІЗАЦІЯ ---

async function syncGlobalCounter(amountUsd = 0) {
    try {
        let response;
        if (amountUsd > 0) {
            response = await fetch(`${API_URL}/update/stoppay.io/${API_KEY}?amount=${amountUsd}`);
        } else {
            response = await fetch(`${API_URL}/get/stoppay.io/${API_KEY}`);
            if (response.status === 404) {
                await fetch(`${API_URL}/create/stoppay.io/${API_KEY}?value=0`);
                return 0;
            }
        }
        const data = await response.json();
        return data.value || 0;
    } catch (e) {
        console.error("Counter API error:", e);
        return totalSavedUsd;
    }
}

async function updateCounter(addUsd = 0) {
    if (!siteData) return;
    
    const lang = localStorage.getItem('lang') || 'UA';
    const info = siteData.languages[lang] || siteData.languages['UA'];
    
    const counterEl = document.getElementById('moneyCounter');
    const currencyEl = document.getElementById('currency');

    totalSavedUsd += addUsd;
    
    // Конвертація для відображення
    const rate = info.exchange_rate || 1;
    const displayValue = Math.round(totalSavedUsd * rate);
    
    if (counterEl) counterEl.innerText = displayValue.toLocaleString();
    if (currencyEl) currencyEl.innerText = info.currency_symbol || '₴';

    // Відправка на сервер тільки якщо натиснули на кнопку
    if (addUsd > 0) {
        const newGlobalUsd = await syncGlobalCounter(addUsd);
        totalSavedUsd = newGlobalUsd;
        const finalDisplay = Math.round(totalSavedUsd * rate);
        if (counterEl) counterEl.innerText = finalDisplay.toLocaleString();
    }
}

// --- ЗАВАНТАЖЕННЯ ---

async function loadData() {
    try {
        const response = await fetch('data.json');
        siteData = await response.json();
        
        // Отримуємо початкове значення
        totalSavedUsd = await syncGlobalCounter(0);
        
        applySavedSettings();
        initCustomMenu();
        renderSite();
    } catch (e) { 
        console.error("Load error:", e); 
    }
}

// --- РЕНДЕРИНГ ---

function renderSite() {
    if (!siteData) return;
    const lang = localStorage.getItem('lang') || 'UA';
    const info = siteData.languages[lang] || siteData.languages['UA'];
    const container = document.getElementById('siteContent');
    
    if (!container) return;
    container.innerHTML = '';

    // Оновлення текстових блоків (звірено з твоїм data.json)
    const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    
    safeSet('mainTitle', info.title);
    safeSet('mainDesc', info.desc);
    safeSet('donateTitle', info.donate_t);
    safeSet('donateDesc', info.donate_d);
    safeSet('donateBtn', info.donate_b);
    safeSet('modalTitle', info.feedback_title);
    safeSet('modalDesc', info.feedback_desc);
    safeSet('modalBtn', info.feedback_btn);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = info.search_placeholder;

    const seoContent = document.getElementById('seoContent');
    if (seoContent) seoContent.innerHTML = info.seo_text;

    // Оновлюємо лічильник при зміні мови
    updateCounter(0);

    const groups = {};
    siteData.services.forEach(service => {
        let catKey = (service.type === lang) ? 'local' : (service.category || 'other');
        if (!groups[catKey]) groups[catKey] = [];
        groups[catKey].push(service);
    });

    const sortedCats = Object.keys(groups).sort((a, b) => a === 'local' ? -1 : 1);

    sortedCats.forEach(catKey => {
        const wrapper = document.createElement('div');
        wrapper.className = `category-wrapper ${catKey === 'local' ? 'active' : ''}`;
        const catTitle = info[`cat_${catKey}`] || catKey.toUpperCase();

        wrapper.innerHTML = `
            <div class="category-header" onclick="this.parentElement.classList.toggle('active')">
                <span>${catTitle} (${groups[catKey].length})</span>
                <span class="arrow-cat">▼</span>
            </div>
            <div class="category-content">
                ${groups[catKey].map(s => `
                    <a href="${s.url}" class="card" target="_blank" onclick="updateCounter(${s.price})">
                        <img src="${s.img}" alt="${s.name}" onerror="this.src='icons/default.png'">
                        <div class="card-name">${s.name}</div>
                    </a>`).join('')}
            </div>
        `;
        container.appendChild(wrapper);
    });
}

// --- ПОШУК ---

function filterServices() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const container = document.getElementById('siteContent');
    const lang = localStorage.getItem('lang') || 'UA';
    const info = siteData.languages[lang];

    if (!query) { renderSite(); return; }

    const matches = siteData.services.filter(s => s.name.toLowerCase().includes(query));
    container.innerHTML = '';

    if (matches.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'category-content';
        grid.style.display = 'grid';
        matches.forEach(s => {
            grid.innerHTML += `
                <a href="${s.url}" class="card" target="_blank" onclick="updateCounter(${s.price})">
                    <img src="${s.img}" alt="${s.name}">
                    <div class="card-name">${s.name}</div>
                </a>`;
        });
        container.appendChild(grid);
    } else {
        container.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:20px;">${info.search_not_found}</p>`;
    }
}

// --- МЕНЮ ТА ТЕМА ---

function initCustomMenu() {
    const list = document.getElementById('dropdownList');
    if (!list) return;
    list.innerHTML = '';
    Object.keys(siteData.languages).forEach(code => {
        const item = document.createElement('div');
        item.className = 'select-item';
        item.innerHTML = `<img src="flags/${code}.png" class="flag-icon"><span>${siteData.languages[code].label}</span>`;
        item.onclick = () => {
            localStorage.setItem('lang', code);
            updateVisuals(code);
            renderSite();
            document.getElementById('dropdownList').classList.remove('active');
        };
        list.appendChild(item);
    });
    updateVisuals(localStorage.getItem('lang') || 'UA');
}

function updateVisuals(code) {
    const flag = document.getElementById('currentFlag');
    const short = document.getElementById('currentShort');
    if (flag) flag.src = `flags/${code}.png`;
    if (short) short.innerText = siteData.languages[code]?.short || code;
}

function toggleMenu() { document.getElementById('dropdownList').classList.toggle('active'); }

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerText = next === 'dark' ? '☀️' : '🌙';
}

function applySavedSettings() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerText = theme === 'dark' ? '☀️' : '🌙';
}

function toggleModal() { document.getElementById('feedbackModal').classList.toggle('active'); }

function closeModalOutside(e) { if (e.target.id === 'feedbackModal') toggleModal(); }

document.addEventListener('click', (e) => {
    const selector = document.getElementById('langSelector');
    if (selector && !selector.contains(e.target)) {
        document.getElementById('dropdownList').classList.remove('active');
    }
});

loadData();
