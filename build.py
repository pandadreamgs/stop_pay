import json
import os
import shutil

# НАЛАШТУВАННЯ: Назва твого репозиторію на GitHub
BASE_PATH = "/stop_pay"

def load_template(template_name):
    with open(f'templates/{template_name}', 'r', encoding='utf-8') as f:
        return f.read()

def build():
    # 1. Підготовка папки dist
    if os.path.exists('dist'):
        shutil.rmtree('dist')
    os.makedirs('dist', exist_ok=True)

    # 2. Перенесення статичних файлів у assets
    if os.path.exists('assets'):
        shutil.copytree('assets', 'dist/assets', dirs_exist_ok=True)
    
    # Копіюємо критичні файли в корінь dist
    root_files = ['manifest.json', 'favicon-32x32.png', 'apple-touch-icon.png', 'Logo.png', 'data.json']
    for rf in root_files:
        if os.path.exists(rf):
            shutil.copy(rf, f'dist/{rf}')

    # 3. Завантажуємо дані
    try:
        with open('data.json', 'r', encoding='utf-8') as f:
            site_data = json.load(f)
    except FileNotFoundError:
        print("Помилка: Файл data.json не знайдено!")
        return

    languages = [lang.lower() for lang in site_data['languages'].keys()]
    layout = load_template('layout.html')

    for lang in languages:
        lang_dir = f'dist/{lang}'
        os.makedirs(lang_dir, exist_ok=True)
        
        # --- ГЕНЕРУЄМО ГОЛОВНУ СТОРІНКУ МОВИ ---
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
        # Виправляємо шляхи в layout під GitHub Pages (додаємо /stop_pay)
        index_html = index_html.replace('href="/', f'href="{BASE_PATH}/')
        index_html = index_html.replace('src="/', f'src="{BASE_PATH}/')
        
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

            # Формуємо HTML інструкції
            steps_html = "".join([f"<li style='margin-bottom:15px; padding-left:10px;'>{step}</li>" for step in content['steps']])
            
            service_body = f"""
            <div class="service-container" style="text-align: left; width: 100%; max-width: 600px; margin: 0 auto;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                    <img src="{BASE_PATH}/{service_meta['icon']}" alt="{service_meta['name']}" style="width: 80px; height: 80px; object-fit: contain;">
                    <h1 style="font-size: 1.8rem; margin: 0;">{content['title']}</h1>
                </div>
                
                <div class="category-wrapper active" style="padding: 20px;">
                    <ol style="line-height: 1.6; font-size: 1.1rem; padding-left: 20px;">
                        {steps_html}
                    </ol>
                </div>

                <div style="text-align: center; margin: 40px 0;">
                    <a href="{service_meta['official_cancel_url']}" class="btn-primary" style="background: var(--accent); color: white; border: none; padding: 15px 40px; text-decoration: none; border-radius: 12px; font-weight: bold;">
                        { "Відкрити сторінку скасування" if lang == 'ua' else "Open Cancellation Page" }
                    </a>
                </div>

                <div class="seo-block" style="opacity: 0.9; margin-top: 40px; font-size: 0.9rem; line-height: 1.5;">
                    {content['seo_text']}
                </div>
            </div>
            """
            
            full_page = layout.replace('{{ content }}', service_body)
            # Виправляємо шляхи
            full_page = full_page.replace('href="/', f'href="{BASE_PATH}/')
            full_page = full_page.replace('src="/', f'src="{BASE_PATH}/')
            full_page = full_page.replace('<title>StopPay</title>', f"<title>{content['title']} | StopPay</title>")

            service_dir = f'dist/{lang}/{s_id}'
            os.makedirs(service_dir, exist_ok=True)
            with open(f'{service_dir}/index.html', 'w', encoding='utf-8') as f:
                f.write(full_page)

    # 4. Кореневий файл редіректу
    root_redirect = f"""
    <!DOCTYPE html>
    <html>
    <head><title>StopPay</title></head>
    <body>
    <script>
        const userLang = navigator.language || navigator.userLanguage;
        const target = (userLang.startsWith('uk') || userLang.startsWith('ru')) ? '/ua/' : '/en/';
        window.location.href = '{BASE_PATH}' + target;
    </script>
    </body>
    </html>
    """
    with open('dist/index.html', 'w', encoding='utf-8') as f:
        f.write(root_redirect)

    print(f"✅ Побудова завершена. Шлях: {BASE_PATH}")

if __name__ == "__main__":
    build()
                
