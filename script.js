let siteData = null;

// Початкове значення лічильника (зберігається в браузері)
let totalSaved = parseInt(localStorage.getItem('totalSaved')) || 124500;

// Унікальний ключ для твого проекту (зміни 'stoppay_project' на щось своє)
const API_KEY = 'A3$D34gsas3#$Fas';
const API_URL = `https://api.countapi.it`;

// Функція для отримання та оновлення глобального лічильника
async function syncGlobalCounter(amount = 0) {
    try {
        let response;
        if (amount > 0) {
            // Додаємо суму до глобального лічильника
            response = await fetch(`${API_URL}/update/stoppay.io/${API_KEY}?amount=${amount}`);
        } else {
            // Просто отримуємо поточне значення при завантаженні
            response = await fetch(`${API_URL}/get/stoppay.io/${API_KEY}`);
            // Якщо ключа ще немає, створимо його (перший запуск)
            if (response.status === 404) {
                await fetch(`${API_URL}/create/stoppay.io/${API_KEY}?value=124500`);
                return 124500;
            }
        }
        const data = await response.json();
        return data.value;
    } catch (e) {
        console.error("Counter API error:", e);
        return totalSaved; // Повертаємо локальне значення, якщо сервіс лежить
    }
}

function getPriceInLocalCurrency(priceInUsd, info) {
    const rate = info.exchange_rate || 1;
    const localPrice = priceInUsd * rate;
    
    // Якщо це гривня, округлюємо до цілого (UX: 301₴ виглядає краще ніж 301.54₴)
    // Якщо долар — лишаємо 2 знаки після коми
    return (info.currency_symbol === '₴') 
        ? Math.round(localPrice) 
        : localPrice.toFixed(2);
}
// --- ЗАВАНТАЖЕННЯ ---
async function loadData() {
    try {
        const response = await fetch('data.json');
        siteData = await response.json();
        
        // Отримуємо актуальну суму з сервера
        totalSaved = await syncGlobalCounter(0);
        
        updateCounter(0); // Відображаємо
        applySavedSettings();
        initCustomMenu();
        renderSite();
    } catch (e) { console.error(e); }
}

// --- ЛІЧИЛЬНИК ---
async function updateCounter(add) {
    // 1. Оновлюємо локально для миттєвого відгуку інтерфейсу
    totalSaved += add;
    localStorage.setItem('totalSaved', totalSaved);
    
    const counterEl = document.getElementById('moneyCounter');
    if (counterEl) {
        counterEl.innerText = totalSaved.toLocaleString();
    }

    // 2. ВІДПРАВЛЯЄМО НА СЕРВЕР (якщо це не просто ініціалізація з нулем)
    if (add > 0) {
        const newValue = await syncGlobalCounter(add);
        // Оновлюємо цифру ще раз значенням, яке повернув сервер (синхронізація з іншими юзерами)
        if (counterEl) {
            counterEl.innerText = newValue.toLocaleString();
        }
    }
}

// --- РЕНДЕРИНГ ---
function renderSite() {
    const lang = localStorage.getItem('lang') || 'UA';
    const info = siteData.languages[lang] || siteData.languages['UA'];
    const container = document.getElementById('siteContent');
    
    if (!container) return;
    container.innerHTML = '';

    // Оновлення текстів інтерфейсу
    document.getElementById('mainTitle').innerText = info.title;
    document.getElementById('mainDesc').innerText = info.desc;
    document.getElementById('searchInput').placeholder = info.search_placeholder || "Search...";
    document.getElementById('seoContent').innerHTML = info.seo_text || "";
    document.getElementById('donateTitle').innerText = info.donate_t;
    document.getElementById('donateDesc').innerText = info.donate_d;
    document.getElementById('donateBtn').innerText = info.donate_b;
    document.getElementById('modalTitle').innerText = info.feedback_title || "Add service";
    document.getElementById('modalDesc').innerText = info.feedback_desc || "";
    document.getElementById('modalBtn').innerText = info.feedback_btn || "Send";

    // Групування за категоріями
    const groups = {};
    siteData.services.forEach(service => {
        // Якщо тип сервісу збігається з мовою (UA/EN), кидаємо в Local
        let catKey = (service.type === lang) ? 'local' : (service.category || 'other');
        if (!groups[catKey]) groups[catKey] = [];
        groups[catKey].push(service);
    });

    // Сортування: спочатку локальні, потім решта
    const sortedCats = Object.keys(groups).sort((a, b) => a === 'local' ? -1 : 1);

    sortedCats.forEach(catKey => {
        const wrapper = document.createElement('div');
        // Локальні розгорнуті за замовчуванням
        wrapper.className = `category-wrapper ${catKey === 'local' ? 'active' : ''}`;
        
        const catTitle = info[`cat_${catKey}`] || catKey.toUpperCase();

        wrapper.innerHTML = `
            <div class="category-header" onclick="this.parentElement.classList.toggle('active')">
                <span>${catTitle} (${groups[catKey].length})</span>
                <span class="arrow-cat">▼</span>
            </div>
            <div class="category-content">
                ${groups[catKey].map(s => `
                    <a href="${s.url}" class="card" target="_blank" onclick="updateCounter(${s.price || 200})">
                        <img src="${s.img}" alt="${s.name} cancellation" loading="lazy" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1055/1055183.png'">
                        <div>${s.name}</div>
                    </a>
                `).join('')}
            </div>
        `;
        container.appendChild(wrapper);
    });
}

// --- ПОШУК (БЕЗ акордеонів для зручності) ---
function filterServices() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const container = document.getElementById('siteContent');
    const lang = localStorage.getItem('lang') || 'UA';
    const info = siteData.languages[lang];

    if (!query) {
        renderSite();
        return;
    }

    const matches = siteData.services.filter(s => s.name.toLowerCase().includes(query));
    container.innerHTML = '';

    if (matches.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'category-content';
        grid.style.display = 'grid'; // Показуємо сітку при пошуку
        matches.forEach(s => {
            grid.innerHTML += `
                <a href="${s.url}" class="card" target="_blank" onclick="updateCounter(${s.price || 200})">
                    <img src="${s.img}" alt="${s.name}">
                    <div>${s.name}</div>
                </a>`;
        });
        container.appendChild(grid);
    } else {
        container.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:20px;">${info.search_not_found || "Not found"}</p>`;
    }
}

// --- МЕНЮ МОВ ТА ТЕМА ---
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
    document.getElementById('currentFlag').src = `flags/${code}.png`;
    document.getElementById('currentShort').innerText = siteData.languages[code]?.short || code;
}

function toggleMenu() {
    document.getElementById('dropdownList').classList.toggle('active');
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.getElementById('themeBtn').innerText = next === 'dark' ? '☀️' : '🌙';
}

function applySavedSettings() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeBtn').innerText = theme === 'dark' ? '☀️' : '🌙';
}

function toggleModal() {
    document.getElementById('feedbackModal').classList.toggle('active');
}

function closeModalOutside(e) {
    if (e.target.id === 'feedbackModal') toggleModal();
}

// Закриття меню
document.addEventListener('click', (e) => {
    if (!document.getElementById('langSelector').contains(e.target)) {
        document.getElementById('dropdownList').classList.remove('active');
    }
});

loadData();
