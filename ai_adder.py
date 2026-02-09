import os
import json
import google.generativeai as genai

def add_service_via_ai(service_name):
    # Налаштування Gemini
    genai.configure(api_key=os.environ["GEMINI_KEY"])
    model = genai.GenerativeModel('gemini-2.0-flash')

    # Завантажуємо існуючий файл
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Перевірка на дублікат
    if any(s['name'].lower() == service_name.lower() for s in data['services']):
        print(f"Сервіс {service_name} вже існує!")
        return

    # Запит до ШІ
    prompt = f"Ти — спеціаліст із наповнення бази даних сервісів StopPay. Твоє завдання: отримати назву сервісу та повернути JSON-об'єкт.

    id: латиниця, нижній регістр, без пробілів.
    
    category: вибери з ['tv', 'phone', 'other'].
    
    price: середня ціна підписки в USD (число).
    
    url: ПРЯМЕ посилання на сторінку скасування підписки.
    
    img: пряме посилання на логотип (SVG або PNG на прозорому фоні).
    
    type: 'UA', якщо сервіс локальний для України, інакше 'global'. Поверни ТІЛЬКИ чистий JSON."
        
    response = model.generate_content(prompt)
    try:
        # Очищуємо відповідь від можливих markdown-тегів
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        new_service = json.loads(clean_json)
        
        # Додаємо помітку для ручної перевірки
        new_service["status"] = "pending" 
        
        data['services'].append(new_service)
        
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"Додано: {new_service['name']}")
    except Exception as e:
        print(f"Помилка парсингу: {e}")

if __name__ == "__main__":
    import sys
    # Отримуємо назву з GitHub Issue title
    target = sys.argv[1].replace("Add Service:", "").strip()
    add_service_via_ai(target)
