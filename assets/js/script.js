let siteData = null;
let totalSavedUsd = 0;

const isGithub = window.location.hostname.includes('github.io');
const BASE_URL = isGithub ? '/stop_pay' : ''; 
const BRIDGE_URL = "https://script.google.com/macros/s/AKfycbywfH00K-KVqfhkPQwWy4P2Knaa0hS1KP1TD6zDfn2K9Bd31Td1pPRxGRj5t1Xt7j1voQ/exec"; 

// --- СИСТЕМНЕ ЗАВАНТАЖЕННЯ ---
async function loadData() {
    try {
        const path = window.location.pathname;
        let langCode = path.includes('/us/') ? 'us' : 'ua';
        const ts = Date.now();

        const servRes = await fetch(`${BASE_URL}/data.json?v=${ts}`).then(r => r.json());
        const uiRes = await fetch(`${BASE_URL}/i18n/${langCode}.json?v=${ts}`).then(r => r.json());

        siteData = {
            ui: uiRes,
            services: servRes.services || [],
            availableLanguages: servRes.available_languages || [langCode],
            currentLang: langCode
        };

        applySavedSettings();
        await initDynamicMenu(); 
        renderSite();
        syncGlobalCounter();
        
    } catch (e) { 
        console.error("КРИТИЧНА ПОМИЛКА:", e); 
        const cont = document.getElementById('siteContent');
        if (cont) cont.innerHTML = `<div style="text-align:center; padding:50px; color:red;">Error loading data</div>`;
    }
}

// --- ДИНАМІЧНЕ МЕНЮ КРАЇН ---
async function initDynamicMenu() {
    const list = document.getElementById('dropdownList');
    if (!list || !siteData.availableLanguages) return;
    
    list.innerHTML = '';
    
    for (const code of siteData.availableLanguages) {
        try {
            const res = await fetch(`${BASE_URL}/i18n/${code}.json`).then(r => r.json());
            
            const item = document.createElement('div');
            item.className = 'select-item';
            item.innerHTML = `
                <img src="${BASE_URL}/assets/icons/flags/${code.toUpperCase()}.png" 
                     onerror="this.src='${BASE_URL}/assets/icons/flags/UNKNOWN.png'" 
                     class="flag-icon">
                <span>${res.label || code.toUpperCase()}</span>
            `;
            
            item.onclick = () => { window.location.href = `${BASE_URL}/${code.toLowerCase()}/`; };
            list.appendChild(item);

            if (code === siteData.currentLang) {
                const f = document.getElementById('currentFlag');
                const s = document.getElementById('currentShort');
                if (f) f.src = `${BASE_URL}/assets/icons/flags/${code.toUpperCase()}.png`;
                if (s) s.innerText = res.short || code.toUpperCase();
            }
        } catch (e) { console.warn(`Could not load label for ${code}`); }
    }
}

// --- ГЛОБАЛЬНИЙ ПОШУК ---
function handleSearch(query) {
    const q = query.toLowerCase().trim();
    const container = document.getElementById('siteContent');
    if (!container || !siteData) return;

    if (q === "") {
        renderSite();
        return;
    }

    const results = siteData.services.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.id && s.id.toLowerCase().includes(q))
    );

    container.innerHTML = '';

    if (results.length > 0) {
        const wrapper = document.createElement('div');
        wrapper.className = 'category-wrapper active';
        const searchTitle = siteData.ui.ui?.search_results || "Search Results";

        wrapper.innerHTML = `
            <div class="category-header">
                <span>${searchTitle} (${results.length})</span>
            </div>
            <div class="category-content" style="display: grid;">
                ${results.map(s => `
                    <div class="card" onclick="handleServiceClick('${s.id}')">
                        <div class="card-icon-wrapper">
                            <img src="${BASE_URL}/${s.img || s.icon}" onerror="this.src='${BASE_URL}/assets/icons/default.png'">
                        </div>
                        <div class="card-name">${s.name}</div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(wrapper);
    } else {
        const noFoundText = siteData.ui.ui?.search_not_found || "Nothing found";
        container.innerHTML = `<p style="text-align:center; padding:50px; opacity:0.5;">${noFoundText}</p>`;
    }
}

// --- РЕНДЕР КАТЕГОРІЙ ---
function renderSite() {
    const container = document.getElementById('siteContent');
    if (!container || !siteData || !siteData.ui) return;

    container.innerHTML = '';
    const info = siteData.ui;
    const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    
    safeSet('counterLabel', info.total_saved);
    safeSet('mainDesc', info.desc);
    
    if (info.ui) {
        safeSet('donateTitle', info.ui.donate_t);
        safeSet('donateDesc', info.ui.donate_d);
        safeSet('donateBtn', info.ui.donate_b);
        const si = document.getElementById('searchInput');
        if (si) si.placeholder = info.ui.search_placeholder;
    }
    
    const seoEl = document.getElementById('seoContent');
    if (seoEl) seoEl.innerHTML = info.seo_text || '';

    const groups = { 'local': [] };
    const curLang = siteData.currentLang.toLowerCase();

    siteData.services.forEach(s => {
        const sType = (s.type || 'global').toLowerCase();
        if (sType === 'global' || sType === curLang) {
            const type = sType === curLang ? 'local' : (s.category || 'other');
            if (!groups[type]) groups[type] = [];
            groups[type].push(s);
        }
    });

    Object.keys(groups).sort((a, b) => a === 'local' ? -1 : 1).forEach(key => {
        if (groups[key].length === 0) return;
        const wrapper = document.createElement('div');
        wrapper.className = `category-wrapper ${key === 'local' ? 'active' : ''}`;
        const catTitle = (info.categories && info.categories[key]) ? info.categories[key] : key.toUpperCase();

        wrapper.innerHTML = `
            <div class="category-header" onclick="this.parentElement.classList.toggle('active')">
                <span>${catTitle} (${groups[key].length})</span>
                <span class="arrow-cat">▼</span>
            </div>
            <div class="category-content">
                ${groups[key].map(s => `
                    <div class="card" onclick="handleServiceClick('${s.id}')">
                        <div class="card-icon-wrapper">
                            <img src="${BASE_URL}/${s.img || s.icon}" onerror="this.src='${BASE_URL}/assets/icons/default.png'">
                        </div>
                        <div class="card-name">${s.name}</div>
                    </div>`).join('')}
            </div>`;
        container.appendChild(wrapper);
    });
    updateCounterDisplay();
}

function handleServiceClick(serviceId) {
    window.location.href = `${BASE_URL}/${siteData.currentLang}/${serviceId}/`;
}

// --- ЛІЧИЛЬНИК ---
async function syncGlobalCounter() {
    try {
        const res = await fetch(BRIDGE_URL);
        const data = await res.json();
        if (data && data.total_saved_usd) {
            totalSavedUsd = data.total_saved_usd;
            updateCounterDisplay();
        }
    } catch (e) { console.log("Counter error"); }
}

function updateCounterDisplay() {
    if (!siteData || !siteData.ui) return;
    const rate = siteData.ui.exchange_rate || 1;
    const cEl = document.getElementById('moneyCounter');
    const curEl = document.getElementById('currency');
    if (cEl) cEl.innerText = Math.round(totalSavedUsd * rate).toLocaleString();
    if (curEl) curEl.innerText = siteData.ui.currency_symbol || '$';
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

async function sendToAi() {
    const input = document.getElementById('aiServiceInput');
    const name = input.value.trim();
    if (!name) return;
    const btn = document.getElementById('modalBtn');
    btn.disabled = true; btn.innerText = "...";
    try {
        await fetch(`${BRIDGE_URL}?service=${encodeURIComponent(name)}`, { mode: 'no-cors' });
        alert(siteData.ui.ui?.ai_success || "Sent!"); 
        toggleModal(); input.value = "";
    } catch (e) { alert("Error"); }
    finally { btn.disabled = false; btn.innerText = siteData.ui.ui?.feedback_btn || "Send"; }
}

loadData();
