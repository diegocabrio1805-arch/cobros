from PIL import Image
import os

# Sprite sheet path
src = r"C:\Users\HP\.gemini\antigravity\brain\3355ff5b-cdc5-45f0-8374-ce7f5377aca8\tsubasa_kick_spritesheet_1775435379599.png"
dest = r"c:\Users\HP\.gemini\antigravity\scratch\cobros\tsubasa_kick.gif"

def create_gif():
    try:
        img = Image.open(src)
        width, height = img.size
        # The AI generates 3x3 grid
        frame_w = width // 3
        frame_h = height // 3
        
        frames = []
        for y in range(3):
            for x in range(3):
                # Crop each frame
                left = x * frame_w
                top = y * frame_h
                right = left + frame_w
                bottom = top + frame_h
                frame = img.crop((left, top, right, bottom))
                frames.append(frame)
        
        # Save as animated GIF
        frames[0].save(dest, save_all=True, append_images=frames[1:], duration=150, loop=0)
        print(f"GIF created at {dest}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_gif()
