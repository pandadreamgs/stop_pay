import json
import urllib.request

def update_rates():
    # 1. Завантажуємо актуальні курси (базова валюта USD)
    # Ми використовуємо сервіс er-api.com (безкоштовно, без ключа)
    url = "https://open.er-api.com/v6/latest/USD"
    
    try:
        with urllib.request.urlopen(url) as response:
            rates_data = json.loads(response.read())
            rates = rates_data.get("rates", {})
    except Exception as e:
        print(f"Помилка при отриманні курсів: {e}")
        return

    # 2. Відкриваємо твій data.json
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 3. Проходимо по мовах і оновлюємо exchange_rate
    # Скрипт шукає код мови (UA, EN, PL) як код валюти (або можна додати ключ currency_code)
    # Для UA ми шукаємо UAH, для PL - PLN і т.д.
    currency_mapping = {
        "UA": "UAH",
        "EN": "USD", # Для англійської зазвичай залишаємо 1
        "PL": "PLN"
    }

    updated = False
    for lang_code, info in data['languages'].items():
        # Визначаємо, яку валюту шукати (якщо в мапі немає, беремо код мови + 'H' або за замовчуванням)
        target_currency = currency_mapping.get(lang_code, lang_code)
        
        if target_currency in rates:
            new_rate = round(rates[target_currency], 2)
            print(f"Оновлюємо {lang_code} ({target_currency}): {info['exchange_rate']} -> {new_rate}")
            info['exchange_rate'] = new_rate
            updated = True

    # 4. Зберігаємо оновлений файл
    if updated:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("data.json успішно оновлено!")

if __name__ == "__main__":
    update_rates()
