let siteData = null;
let totalSavedUsd = 0;
const BASE_URL = "/stop_pay"; 
const BRIDGE_URL = "https://script.google.com/macros/s/AKfycbywfH00K-KVqfhkPQwWy4P2Knaa0hS1KP1TD6zDfn2K9Bd31Td1pPRxGRj5t1Xt7j1voQ/exec"; 

// --- ПОШУК (Миємо старий стиль пошуку) ---
function handleSearch(query) {
    const q = query.toLowerCase().trim();
    const categories = document.querySelectorAll('.category-wrapper');
    
    categories.forEach(wrapper => {
        let hasVisibleCards = false;
        const cards = wrapper.querySelectorAll('.card');
        
        cards.forEach(card => {
            const name = card.querySelector('.card-name').innerText.toLowerCase();
            if (name.includes(q)) {
                card.style.display = 'flex';
                hasVisibleCards = true;
            } else {
                card.style.display = 'none';
            }
        });
        wrapper.style.display = hasVisibleCards ? 'block' : 'none';
    });
}

// --- ЛІЧИЛЬНИК ---
async function syncGlobalCounter(amountUsd = 0) {
    if (!BRIDGE_URL) return;
    const url = new URL(BRIDGE_URL);
    if (amountUsd > 0) url.searchParams.set('amount', amountUsd);
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.total_saved_usd !== undefined) {
            totalSavedUsd = data.total_saved_usd;
            localStorage.setItem('cachedTotalSaved', totalSavedUsd);
            updateCounterDisplay();
        }
    } catch (e) {
        totalSavedUsd = parseFloat(localStorage.getItem('cachedTotalSaved')) || 0;
        updateCounterDisplay();
    }
}

function updateCounterDisplay() {
    if (!siteData || !siteData.ui) return;
    const rate = siteData.ui.exchange_rate || 1;
    const counterEl = document.getElementById('moneyCounter');
    const currencyEl = document.getElementById('currency');
    if (counterEl) counterEl.innerText = Math.round(totalSavedUsd * rate).toLocaleString();
    if (currencyEl) currencyEl.innerText = siteData.ui.currency_symbol;
}

// --- РЕНДЕРИНГ (Повертаємо стильні картки) ---
function renderSite() {
    if (!siteData || !siteData.ui) return;
    const info = siteData.ui;
    const container = document.getElementById('siteContent');
    if (!container) return; 

    container.innerHTML = '';
    const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    
    // Тексти інтерфейсу
    safeSet('counterLabel', info.total_saved);
    safeSet('mainDesc', info.desc);
    safeSet('donateTitle', info.ui.donate_t);
    safeSet('donateDesc', info.ui.donate_d);
    safeSet('donateBtn', info.ui.donate_b);
    
    const seoEl = document.getElementById('seoContent');
    if (seoEl) seoEl.innerHTML = info.seo_text || '';
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = info.ui.search_placeholder;
        // Прив'язуємо функцію пошуку до інпута
        searchInput.oninput = (e) => handleSearch(e.target.value);
    }

    updateCounterDisplay();

    const groups = { 'local': [] };
    const currentCountry = siteData.currentLang.toLowerCase();

    siteData.services.forEach(s => {
        if (s.type === 'global' || s.type === currentCountry) {
            const type = s.type === currentCountry ? 'local' : (s.category || 'other');
            if (!groups[type]) groups[type] = [];
            groups[type].push(s);
        }
    });

    Object.keys(groups).sort((a, b) => a === 'local' ? -1 : 1).forEach(key => {
        if (groups[key].length === 0) return;
        const wrapper = document.createElement('div');
        wrapper.className = `category-wrapper ${key === 'local' ? 'active' : ''}`;
        const catTitle = info.categories[key] || key.toUpperCase();

        wrapper.innerHTML = `
            <div class="category-header" onclick="this.parentElement.classList.toggle('active')">
                <span>${catTitle} (${groups[key].length})</span>
                <span class="arrow-cat">▼</span>
            </div>
            <div class="category-content">
                ${groups[key].map(s => `
                    <div class="card" onclick="handleServiceClick(${s.price || 0}, '${s.id}')">
                        <div class="card-icon-wrapper">
                            <img src="${BASE_URL}/${s.img || s.icon}" onerror="this.src='${BASE_URL}/assets/icons/default.png'">
                        </div>
async function loadData() {
    try {
        const pathParts = window.location.pathname.split('/');
        // Визначаємо мову з URL (напр. /stop_pay/ua/ -> ua)
        let langCode = 'ua';
        if (pathParts.includes('ua')) langCode = 'ua';
        if (pathParts.includes('us')) langCode = 'us';

        console.log("Loading for lang:", langCode);

        // Завантажуємо дані паралельно
        const [uiRes, servRes] = await Promise.all([
            fetch(`${BASE_URL}/i18n/${langCode}.json`),
            fetch(`${BASE_URL}/data.json`)
        ]);

        const uiData = await uiRes.json();
        const allData = await servRes.json();

        // Формуємо об'єкт так, щоб renderSite його розумів
        siteData = {
            ui: uiData,
            services: allData.services,
            currentLang: langCode
        };

        console.log("Data loaded successfully:", siteData);

        applySavedSettings();
        renderSite(); // МАЄ З'ЯВИТИСЯ ТУТ!
        syncGlobalCounter();
        
    } catch (e) { 
        console.error("КРИТИЧНА ПОМИЛКА ЗАВАНТАЖЕННЯ:", e); 
    }
}


function initCustomMenu() {
    const list = document.getElementById('dropdownList');
    if (!list) return;
    list.innerHTML = '';
    
    Object.keys(siteData.availableCountries).forEach(code => {
        const country = siteData.availableCountries[code];
        const item = document.createElement('div');
        item.className = 'select-item';
        item.innerHTML = `<img src="${BASE_URL}/assets/icons/flags/${code.toUpperCase()}.png" class="flag-icon"><span>${country.label}</span>`;
        item.onclick = () => {
            window.location.href = `${BASE_URL}/${code.toLowerCase()}/`;
        };
        list.appendChild(item);
    });
    updateVisuals(siteData.currentLang);
}

function updateVisuals(code) {
    const flag = document.getElementById('currentFlag');
    const short = document.getElementById('currentShort');
    if (flag) flag.src = `${BASE_URL}/assets/icons/flags/${code.toUpperCase()}.png`;
    if (short) short.innerText = code.toUpperCase();
}

// Меню та Тема
function toggleMenu() { document.getElementById('dropdownList').classList.toggle('active'); }
function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}
function applySavedSettings() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}
function toggleModal() { document.getElementById('feedbackModal').classList.toggle('active'); }
function closeModalOutside(e) { if (e.target.id === 'feedbackModal') toggleModal(); }

loadData();
