import json
import os
import shutil

def load_template(template_name):
    with open(f'templates/{template_name}', 'r', encoding='utf-8') as f:
        return f.read()

def build():
    # 1. Підготовка папки dist
    if os.path.exists('dist'):
        shutil.rmtree('dist')
    os.makedirs('dist', exist_ok=True)

    # 2. Перенесення статичних файлів у нову структуру assets
    if os.path.exists('assets'):
        shutil.copytree('assets', 'dist/assets', dirs_exist_ok=True)
    
    # Копіюємо критичні файли в корінь dist для роботи PWA та іконок
    root_files = ['manifest.json', 'favicon-32x32.png', 'apple-touch-icon.png', 'Logo.png', 'data.json']
    for rf in root_files:
        if os.path.exists(rf):
            shutil.copy(rf, f'dist/{rf}')

    # 3. Завантажуємо дані для визначення мов
    with open('data.json', 'r', encoding='utf-8') as f:
        site_data = json.load(f)
    languages = [lang.lower() for lang in site_data['languages'].keys()]
    
    layout = load_template('layout.html')

    for lang in languages:
        lang_dir = f'dist/{lang}'
        os.makedirs(lang_dir, exist_ok=True)
        
        # --- ГЕНЕРУЄМО ГОЛОВНУ СТОРІНКУ МОВИ ---
        # Повертаємо твій оригінальний пошук та опис
        lang_upper = lang.upper()
        main_info = site_data['languages'][lang_upper]
        
        main_content = f"""
        <p id="mainDesc">{main_info['desc']}</p>
        <div class="search-container">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" class="search-input" onkeyup="filterServices()">
        </div>
        <div id="siteContent" style="width: 100%; max-width: 600px;"></div>
        """
        
        index_html = layout.replace('{{ content }}', main_content)
        # Додаємо скрипт для автоматичного встановлення мови в LocalStorage при переході
        index_html = index_html.replace('<body>', f'<body onload="localStorage.setItem(\'lang\', \'{lang_upper}\')">')
        
        with open(f'{lang_dir}/index.html', 'w', encoding='utf-8') as f:
            f.write(index_html)

        # --- ГЕНЕРУЄМО СТОРІНКИ СЕРВІСІВ (SEO) ---
        if not os.path.exists('services'):
            continue
            
        service_files = [f for f in os.listdir('services') if f.endswith('.json')]
        for s_file in service_files:
            s_id = s_file.replace('.json', '')
            content_path = f'content/{lang}/{s_file}'
            
            if not os.path.exists(content_path):
                continue

            with open(f'services/{s_file}', 'r', encoding='utf-8') as f:
                service_meta = json.load(f)
            with open(content_path, 'r', encoding='utf-8') as f:
                content = json.load(f)

            # Формуємо HTML для сторінки сервісу з використанням твоїх стилів
            steps_html = "".join([f"<li style='margin-bottom:15px; padding-left:10px;'>{step}</li>" for step in content['steps']])
            
            service_body = f"""
            <div class="service-container" style="text-align: left; width: 100%; max-width: 600px; margin: 0 auto;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                    <img src="/{service_meta['icon']}" alt="{service_meta['name']}" style="width: 80px; height: 80px; object-fit: contain;">
                    <h1 style="font-size: 1.8rem; margin: 0;">{content['title']}</h1>
                </div>
                
                <div class="category-wrapper active" style="padding: 20px;">
                    <ol style="line-height: 1.6; font-size: 1.1rem; padding-left: 20px;">
                        {steps_html}
                    </ol>
                </div>

                <div style="text-align: center; margin: 40px 0;">
                    <a href="{service_meta['official_cancel_url']}" class="btn-donate" style="background: var(--accent); color: white; border: none; padding: 15px 40px; text-decoration: none;">
                        { "Відкрити сторінку скасування" if lang == 'ua' else "Open Cancellation Page" }
                    </a>
                </div>

                <div class="seo-block" style="opacity: 0.9;">
                    {content['seo_text']}
                </div>
            </div>
            """
            
            full_page = layout.replace('{{ content }}', service_body)
            full_page = full_page.replace('<title>StopPay</title>', f"<title>{content['title']} | StopPay</title>")

            service_dir = f'dist/{lang}/{s_id}'
            os.makedirs(service_dir, exist_ok=True)
            with open(f'{service_dir}/index.html', 'w', encoding='utf-8') as f:
                f.write(full_page)

    # 4. Кореневий файл з інтелектуальним редіректом
    root_redirect = """
    <!DOCTYPE html>
    <html>
    <head><title>StopPay</title></head>
    <body>
    <script>
        const userLang = navigator.language || navigator.userLanguage;
        if (userLang.startsWith('uk') || userLang.startsWith('ru')) {
            window.location.href = '/ua/';
        } else {
            window.location.href = '/en/';
        }
    </script>
    </body>
    </html>
    """
    with open('dist/index.html', 'w', encoding='utf-8') as f:
        f.write(root_redirect)

    print(f"✅ Успішно згенеровано мови: {', '.join(languages)}")

if __name__ == "__main__":
    build()
            
