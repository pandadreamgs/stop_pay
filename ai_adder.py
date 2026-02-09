import os
import json
import google.generativeai as genai

def add_service_via_ai(service_name):
    # Налаштування Gemini
    genai.configure(api_key=os.environ["GEMINI_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Завантажуємо існуючий файл
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Перевірка на дублікат
    if any(s['name'].lower() == service_name.lower() for s in data['services']):
        print(f"Сервіс {service_name} вже існує!")
        return

    # Запит до ШІ
    prompt = f"Згенеруй дані для сервісу '{service_name}' у форматі JSON для проекту StopPay. Слідуй правилам: category може бути tv, phone, other. Type: UA або global. Поверни тільки об'єкт."
    
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
