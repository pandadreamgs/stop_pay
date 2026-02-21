import os
from PIL import Image
import cairosvg
import io

SOURCE_DIR = 'images'
DEST_DIR = 'assets/icons'
SIZE = (128, 128)

def process_icons():
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)

    if not os.path.exists(SOURCE_DIR):
        print(f"Папка {SOURCE_DIR} не знайдена!")
        return

    for filename in os.listdir(SOURCE_DIR):
        file_lower = filename.lower()
        if file_lower.endswith(('.png', '.jpg', '.jpeg', '.webp', '.svg')):
            img_path = os.path.join(SOURCE_DIR, filename)
            try:
                if file_lower.endswith('.svg'):
                    out = cairosvg.svg2png(url=img_path, output_width=SIZE[0], output_height=SIZE[1])
                    img = Image.open(io.BytesIO(out)).convert("RGBA")
                else:
                    img = Image.open(img_path).convert("RGBA")

                img.thumbnail(SIZE, Image.Resampling.LANCZOS)
                new_img = Image.new("RGBA", SIZE, (0, 0, 0, 0))
                upper_left = ((SIZE[0] - img.size[0]) // 2, (SIZE[1] - img.size[1]) // 2)
                new_img.paste(img, upper_left)

                base_name = os.path.splitext(filename)[0]
                save_path = os.path.join(DEST_DIR, f"{base_name}.png")
                new_img.save(save_path, "PNG", optimize=True)
                
                # Закриваємо об'єкти, щоб звільнити файл
                img.close()
                new_img.close()

                # ВИДАЛЯЄМО ОРИГІНАЛ
                os.remove(img_path)
                print(f"✅ Оброблено та видалено: {filename}")

            except Exception as e:
                print(f"❌ Помилка {filename}: {e}")

if __name__ == "__main__":
    process_icons()
                
