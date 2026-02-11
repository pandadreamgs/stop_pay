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

    # 2. Перенесення статичних файлів (тепер в assets)
    # Копіюємо всю папку assets в dist/assets
    if os.path.exists('assets'):
        shutil.copytree('assets', 'dist/assets', dirs_exist_ok=True)
    
    # Якщо маніфест і фавіконки в корені, їх теж треба копіювати
    for root_file in ['manifest.json', 'favicon-32x32.png', 'apple-touch-icon.png']:
        if os.path.exists(root_file):
            shutil.copy(root_file, f'dist/{root_file}')

    # 3. Завантажуємо дані та мови
    # (Краще завантажити твій список мов із файлу, але поки лишимо так)
    languages = ['ua', 'en'] 
    
    # Головний шаблон (твій дизайн)
    layout = load_template('layout.html')

    for lang in languages:
        lang_dir = f'dist/{lang}'
        os.makedirs(lang_dir, exist_ok=True)
        
        # --- ГЕНЕРУЄМО ГОЛОВНУ СТОРІНКУ МОВИ ---
        # Тут ми просто копіюємо твій основний інтерфейс
        # Але в ньому script.js має знати, яку мову вантажити
        index_html = layout.replace('{{ content }}', '<div id="siteContent"></div>')
        with open(f'{lang_dir}/index.html', 'w', encoding='utf-8') as f:
            f.write(index_html)

        # --- ГЕНЕРУЄМО СТОРІНКИ СЕРВІСІВ (SEO) ---
        if not os.path.exists('services'):
            continue
            
        service_files = [f for f in os.listdir('services') if f.endswith('.json')]
        for s_file in service_files:
            s_id = s_file.replace('.json', '')
            
            # Шлях до контенту
            content_path = f'content/{lang}/{s_file}'
            if not os.path.exists(content_path):
                continue

            with open(f'services/{s_file}', 'r', encoding='utf-8') as f:
                service_meta = json.load(f)
            with open(content_path, 'r', encoding='utf-8') as f:
                content = json.load(f)

            # Формуємо HTML для сторінки сервісу (використовуємо твій дизайн!)
            steps_html = "".join([f"<li>{step}</li>" for step in content['steps']])
            
            service_body = f"""
            <div class="service-page">
                <header class="service-header">
                    <img src="/{service_meta['icon']}" alt="{service_meta['name']}" class="service-logo-large">
                    <h1>{content['title']}</h1>
                </header>
                
                <div class="instruction-card">
                    <ol class="steps-list">{steps_html}</ol>
                </div>

                <div class="action-section">
                    <a href="{service_meta['official_cancel_url']}" class="btn-primary" target="_blank">
                        { "Скасувати підписку" if lang == 'ua' else "Cancel Subscription" }
                    </a>
                </div>

                <div class="seo-text">{content['seo_text']}</div>
            </div>
            """
            
            # Вставляємо контент у головний шаблон
            full_page = layout.replace('{{ content }}', service_body)
            # Міняємо заголовок (SEO)
            full_page = full_page.replace('<title>StopPay</title>', f"<title>{content['title']}</title>")

            # Зберігаємо
            service_dir = f'dist/{lang}/{s_id}'
            os.makedirs(service_dir, exist_ok=True)
            with open(f'{service_dir}/index.html', 'w', encoding='utf-8') as f:
                f.write(full_page)

    # 4. Створюємо перенаправлення в корені (index.html)
    # Щоб людина з stoppay.com потрапляла на /ua/ або /en/
    root_redirect = """
    <html><script>
    var lang = str = navigator.language.split('-')[0];
    if (lang == 'uk') window.location.href = '/ua/';
    else window.location.href = '/en/';
    </script></html>
    """
    with open('dist/index.html', 'w', encoding='utf-8') as f:
        f.write(root_redirect)

    print("✅ Build complete!")

if __name__ == "__main__":
    build()
            
