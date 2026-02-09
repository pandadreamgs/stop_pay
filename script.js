let siteData = null;
let totalSavedUsd = 0; // Базове значення в USD, яке прийде з сервера

// Унікальний ключ для твого проекту
const API_KEY = 'A3$D34gsas3#$Fas';
const API_URL = `https://api.countapi.it`;

// --- КОНВЕРТАЦІЯ ТА ЛІЧИЛЬНИК ---

function getPriceInLocalCurrency(priceInUsd, info) {
    const rate = info.exchange_rate || 1;
    const localPrice = priceInUsd * rate;
    return (info.currency_symbol === '₴') 
        ? Math.round(localPrice) 
        : localPrice.toFixed(2);
}

async function syncGlobalCounter(amountUsd = 0) {
    try {
        let response;
        if (amountUsd > 0) {
            response = await fetch(`${API_URL}/update/stoppay.io/${API_KEY}?amount=${amountUsd}`);
        } else {
            response = await fetch(`${API_URL}/get/stoppay.io/${API_KEY}`);
            if (response.status === 404) {
                // Створюємо початкове значення 2800$ (приблизно 120к грн)
                await fetch(`${API_URL}/create/stoppay.io/${API_KEY}?value=2800`);
                return 2800;
            }
        }
        const data = await response.json();
        return data.value;
    } catch (e) {
        console.error("Counter API error:", e);
        return totalSavedUsd;
    }
}

async function updateCounter(addUsd) {
    const lang = localStorage.getItem('lang') || 'UA';
    const info = siteData.languages[lang];
    const counterEl = document.getElementById('moneyCounter');
    const currencyEl = document.getElementById('currency');

    // 1. Оновлюємо локально
    totalSavedUsd += addUsd;
    const displayValue = Math.round(totalSavedUsd * info.exchange_rate);
    
    if (counterEl) counterEl.innerText = displayValue.toLocaleString();
    if (currencyEl) currencyEl.innerText = info.currency_symbol;

    // 2. Синхронізуємо з сервером
    if (addUsd > 0) {
        const newGlobalUsd = await syncGlobalCounter(addUsd);
        totalSavedUsd = newGlobalUsd;
        const finalDisplay = Math.round(totalSavedUsd * info.exchange_rate);
        if (counterEl) counterEl.innerText = finalDisplay.toLocaleString();
    }
}

// --- ЗАВАНТАЖЕННЯ ---

async function loadData() {
    try {
        const response = await fetch('data.json');
        siteData = await response.json();
        
        totalSavedUsd = await syncGlobalCounter(0);
        
        applySavedSettings();
        initCustomMenu();
        renderSite();
    } catch (e) { console.error("Load error:", e); }
}

// --- РЕНДЕРИНГ ---

function renderSite() {
    const lang = localStorage.getItem('lang') || 'UA';
    const info = siteData.languages[lang] || siteData.languages['UA'];
    const container = document.getElementById('siteContent');
    
    if (!container) return;
    container.innerHTML = '';

    // Оновлення статичних текстів
    document.getElementById('mainTitle').innerText = info.title;
    document.getElementById('mainDesc').innerText = info.desc;
    document.getElementById('searchInput').placeholder = info.search_placeholder;
    document.getElementById('seoContent').innerHTML = info.seo_text;
    document.getElementById('donateTitle').innerText = info.donate_t;
    document.getElementById('donateDesc').innerText = info.donate_d;
    document.getElementById('donateBtn').innerText = info.donate_b;
    document.getElementById('modalTitle').innerText = info.feedback_title;
    document.getElementById('modalDesc').innerText = info.feedback_desc;
    document.getElementById('modalBtn').innerText = info.feedback_btn;

    // Глобальний лічильник (відображення у валюті)
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
                ${groups[catKey].map(s => {
                    const localPrice = getPriceInLocalCurrency(s.price, info);
                    return `
                    <a href="${s.url}" class="card" target="_blank" onclick="updateCounter(${s.price})">
                        <img src="${s.img}" alt="${s.name}" loading="lazy" onerror="this.src='icons/default.png'">
                        <div class="card-info">
                            <div class="card-name">${s.name}</div>
                            <div class="card-price">-${localPrice} ${info.currency_symbol}</div>
                        </div>
                    </a>`;
                }).join('')}
            </div>
        `;
        container.appendChild(wrapper);
    });
}

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
            const localPrice = getPriceInLocalCurrency(s.price, info);
            grid.innerHTML += `
                <a href="${s.url}" class="card" target="_blank" onclick="updateCounter(${s.price})">
                    <img src="${s.img}" alt="${s.name}">
                    <div class="card-info">
                        <div class="card-name">${s.name}</div>
                        <div class="card-price">-${localPrice} ${info.currency_symbol}</div>
                    </div>
                </a>`;
        });
        container.appendChild(grid);
    } else {
        container.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:20px;">${info.search_not_found}</p>`;
    }
}

// --- ІНТЕРФЕЙС ---

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
