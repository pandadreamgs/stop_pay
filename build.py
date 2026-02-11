import json
import os
import shutil

def build():
    # 1. Очищуємо або створюємо папку dist
    if os.path.exists('dist'):
        shutil.rmtree('dist')
    os.makedirs('dist', exist_ok=True)

    # Копіюємо assets (CSS, JS) у dist
    shutil.copy('style.css', 'dist/style.css')
    shutil.copy('script.js', 'dist/script.js')
    if os.path.exists('assets'):
        shutil.copytree('assets', 'dist/assets', dirs_exist_ok=True)

    # 2. Завантажуємо список мов (можна взяти з твого старого data.json або створити конфіг)
    languages = ['ua', 'en'] 

    for lang in languages:
        lang_dir = f'dist/{lang}'
        os.makedirs(lang_dir, exist_ok=True)
        
        # Тут ми будемо створювати головну сторінку для кожної мови (index.html)
        # Для початку просто копіюємо твій старий index.html як базу
        shutil.copy('index.html', f'dist/{lang}/index.html')

        # 3. Генеруємо сторінки сервісів
        service_files = os.listdir('services')
        for s_file in service_files:
            s_id = s_file.replace('.json', '')
            
            # Створюємо шлях dist/ua/netflix/index.html
            service_dir = f'dist/{lang}/{s_id}'
            os.makedirs(service_dir, exist_ok=True)
            
            # Читаємо дані сервісу та контент
            with open(f'services/{s_file}', 'r', encoding='utf-8') as f:
                service_data = json.load(f)
            
            content_path = f'content/{lang}/{s_file}'
            if os.path.exists(content_path):
                with open(content_path, 'r', encoding='utf-8') as f:
                    content_data = json.load(f)
            else:
                continue

            # Створюємо просту сторінку інструкції (поки що дуже базову)
            html_content = f"""
            <html>
            <head><link rel="stylesheet" href="../../style.css"></head>
            <body>
                <h1>{content_data['title']}</h1>
                <ul>
                    {"".join([f"<li>{step}</li>" for step in content_data['steps']])}
                </ul>
                <a href="{service_data['official_cancel_url']}" class="btn">Скасувати підписку</a>
            </body>
            </html>
            """
            
            with open(f'{service_dir}/index.html', 'w', encoding='utf-8') as f:
                f.write(html_content)

    print("✅ Сайт успішно згенеровано в папку dist/")

if __name__ == "__main__":
    build()
          
