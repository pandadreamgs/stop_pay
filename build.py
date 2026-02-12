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

    # 2. АВТО-ПОШУК МОВ: скануємо папку i18n
    available_langs = [f.replace('.json', '') for f in os.listdir('i18n') if f.endswith('.json')]
    print(f"Знайдено мови: {available_langs}")

    # 3. ЗБІР СЕРВІСІВ: зшиваємо всі JSON з папки services
    all_services = []
    if os.path.exists('services'):
        for s_file in os.listdir('services'):
            if s_file.endswith('.json'):
                with open(os.path.join('services', s_file), 'r', encoding='utf-8') as f:
                    try:
                        all_services.append(json.load(f))
                    except Exception as e:
                        print(f"Помилка у файлі {s_file}: {e}")

    # 4. СТВОРЕННЯ НОВОГО data.json у dist (головний файл для JS)
    with open('dist/data.json', 'w', encoding='utf-8') as f:
        json.dump({
            "available_languages": available_langs,
            "services": all_services
        }, f, ensure_ascii=False, indent=2)

    # 5. КОПІЮВАННЯ АСЕТІВ
    if os.path.exists('assets'):
        shutil.copytree('assets', 'dist/assets', dirs_exist_ok=True)
    if os.path.exists('i18n'):
        shutil.copytree('i18n', 'dist/i18n', dirs_exist_ok=True)
    
    for file in ['Logo.png', 'favicon-32x32.png', 'manifest.json']:
        if os.path.exists(file):
            shutil.copy(file, f'dist/{file}')

    # 6. ГЕНЕРАЦІЯ HTML СТОРІНОК (Layout + Index)
    # Завантажуємо шаблони
    try:
        layout = open('templates/layout.html', 'r', encoding='utf-8').read()
        index_body = open('templates/index_body.html', 'r', encoding='utf-8').read()
        
        for lang in available_langs:
            lang_dir = os.path.join('dist', lang)
            os.makedirs(lang_dir, exist_ok=True)
            
            # Створюємо головну сторінку для кожної мови
            full_index = layout.replace('{{ content }}', index_body)
            with open(os.path.join(lang_dir, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(full_index)

            # Тут можна додати генерацію сторінок окремих сервісів (якщо треба)
            
    except Exception as e:
        print(f"Помилка генерації HTML: {e}")

    # 7. РЕДІРЕКТ У КОРЕНІ (щоб при вході кидало на /ua/)
    with open('dist/index.html', 'w', encoding='utf-8') as f:
        f.write(f'<html><head><meta http-equiv="refresh" content="0; url={BASE_PATH}/ua/"></head></html>')

    print(f"Build complete! Services: {len(all_services)}, Languages: {available_langs}")

if __name__ == "__main__":
    build()
            
