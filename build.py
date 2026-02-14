import json
import os
import shutil

# Назва твого репозиторію на GitHub
BASE_PATH = "/stop_pay"

def build():
    # 1. Очищення та створення структури
    if os.path.exists('dist'):
        shutil.rmtree('dist')
    os.makedirs('dist', exist_ok=True)

    # 2. АВТО-ПОШУК МОВ
    available_langs = [f.replace('.json', '') for f in os.listdir('i18n') if f.endswith('.json')]
    print(f"Знайдено мови: {available_langs}")

    # 3. ЗБІР СЕРВІСІВ
    all_services = []
    if os.path.exists('services'):
        for s_file in os.listdir('services'):
            if s_file.endswith('.json'):
                with open(os.path.join('services', s_file), 'r', encoding='utf-8') as f:
                    try:
                        all_services.append(json.load(f))
                    except Exception as e:
                        print(f"Помилка у файлі {s_file}: {e}")

    # 4. СТВОРЕННЯ data.json
    with open('dist/data.json', 'w', encoding='utf-8') as f:
        json.dump({
            "available_languages": available_langs,
            "services": all_services
        }, f, ensure_ascii=False, indent=2)

    # 5. КОПІЮВАННЯ АСЕТІВ ТА ІКОНОК
    if os.path.exists('assets'):
        shutil.copytree('assets', 'dist/assets', dirs_exist_ok=True)
    
    if os.path.exists('i18n'):
        shutil.copytree('i18n', 'dist/i18n', dirs_exist_ok=True)
    
    for file in ['Logo.png', 'manifest.json']:
        if os.path.exists(file):
            shutil.copy(file, f'dist/{file}')
    
    if os.path.exists('assets/favicons/favicon-32x32.png'):
        shutil.copy('assets/favicons/favicon-32x32.png', 'dist/favicon.png')

    # 6. ГЕНЕРАЦІЯ HTML СТОРІНОК
    try:
        layout = open('templates/layout.html', 'r', encoding='utf-8').read()
        index_body = open('templates/index_body.html', 'r', encoding='utf-8').read()
        page_tpl = open('templates/page.html', 'r', encoding='utf-8').read()
        
        for lang in available_langs:
            lang_dir = os.path.join('dist', lang)
            os.makedirs(lang_dir, exist_ok=True)
            
            with open(f'i18n/{lang}.json', 'r', encoding='utf-8') as f_lang:
                lang_data = json.load(f_lang)

            full_index = layout.replace('{{ content }}', index_body)
            with open(os.path.join(lang_dir, 'index.html'), 'w', encoding='utf-8') as f_out:
                f_out.write(full_index)

            for s in all_services:
                content_path = f'content/{lang}/{s["id"]}.json'
                if os.path.exists(content_path):
                    with open(content_path, 'r', encoding='utf-8') as f_in:
                        c = json.load(f_in)
                    
                    price = str(s.get('price_usd', 0))
                    sid = s['id']

                    # 1. Посилання в першому кроці (ВЕДЕ НА ГОЛОВНУ)
                    steps = list(c['steps'])
                    if steps:
                        clean_url = s["official_url"].replace("https://", "").replace("http://", "").rstrip('/')
                        # Використовуємо одинарні лапки всередині onclick, щоб уникнути конфліктів
                        link_html = f'<a href="{s["official_url"]}" target="_blank" rel="noopener" onclick="handlePriceAdd(\'{price}\', \'{sid}\')">{clean_url}</a>'
                        steps[0] = steps[0].replace(clean_url, link_html)
                    
                    steps_html = "".join([f"<li>{step}</li>" for step in steps])

                    # 2. Посилання в "Пораді" (ВЕДЕ НА ГОЛОВНУ)
                    # Формуємо чистий HTML тег для заміни плейсхолдера
                    hint_link = f'<a href="{s["official_url"]}" target="_blank" rel="noopener" onclick="handlePriceAdd(\'{price}\', \'{sid}\')">{s["official_url"]}</a>'
                    hint_text = lang_data.get('cancel_hint', '').replace('{{ official_url }}', hint_link)
                    
                    btn_text = lang_data.get('ui', {}).get('btn_cancel', 'Скасувати підписку')

                    # 3. Підстановка в шаблон (cancel_url ТУТ ВЕДЕ НА СТОРІНКУ СКАСУВАННЯ)
                    pg = page_tpl.replace('{{ title }}', c['title']) \
                                 .replace('{{ price_usd }}', price) \
                                 .replace('{{ service_id }}', sid) \
                                 .replace('{{ description }}', c.get('desc', c.get('description', ''))) \
                                 .replace('{{ steps }}', steps_html) \
                                 .replace('{{ cancel_hint }}', hint_text) \
                                 .replace('{{ btn_cancel_text }}', btn_text) \
                                 .replace('{{ cancel_url }}', s['official_cancel_url']) \
                                 .replace('{{ seo_text }}', c.get('seo_text', ''))
                    
                    full_pg = layout.replace('{{ content }}', pg)
                    
                    s_dir = os.path.join(lang_dir, s["id"])
                    os.makedirs(s_dir, exist_ok=True)
                    with open(os.path.join(s_dir, 'index.html'), 'w', encoding='utf-8') as f_out:
                        f_out.write(full_pg)
            
    except Exception as e:
        print(f"Помилка генерації HTML: {e}")

    # 7. РОЗУМНИЙ РЕДІРЕКТ
    with open('dist/index.html', 'w', encoding='utf-8') as f:
        f.write(f'''<!DOCTYPE html>
<html>
<head>
    <script>
        (function() {{
            var savedLang = localStorage.getItem('user_lang');
            var root = "{BASE_PATH}";
            if (savedLang && savedLang !== 'ua') {{
                window.location.replace(root + '/' + savedLang + '/');
            }} else {{
                window.location.replace(root + '/ua/');
            }}
        }})();
    </script>
</head>
<body>
    <p>Redirecting...</p>
</body>
</html>''')

if __name__ == "__main__":
    build()
                    
