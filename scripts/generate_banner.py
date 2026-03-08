import sys
import argparse
from PIL import Image, ImageDraw, ImageFont
import os

def generate_banner(name, score, subject, rank, output_path):
    # Canvas Size (Twitter/WhatsApp OpenGraph standard)
    width, height = 1200, 630
    
    # Create Background (Deep Navy/Purple Gradient style)
    img = Image.new('RGB', (width, height), color=(10, 10, 30))
    draw = ImageDraw.Draw(img)
    
    # Draw Decorative Shapes
    draw.ellipse([800, -200, 1400, 400], fill=(30, 30, 80)) # Top right glow
    draw.ellipse([-200, 400, 400, 900], fill=(20, 20, 60))  # Bottom left glow
    
    # Draw Border
    border_color = (100, 100, 255) # Neon Blue
    draw.rectangle([20, 20, 1180, 610], outline=border_color, width=8)
    
    # Text Settings
    # Note: Using default font for now, but can be swapped for 'assets/fonts/Inter-Bold.ttf'
    try:
        # Try to find a system font or local font
        font_title = ImageFont.truetype("arial.ttf", 80)
        font_main = ImageFont.truetype("arial.ttf", 120)
        font_sub = ImageFont.truetype("arial.ttf", 50)
    except:
        font_title = font_main = font_sub = None

    # Header
    draw.text((80, 80), "BHARAT LEAGUE", fill=(255, 255, 255), font=font_title)
    draw.text((80, 170), "ACHIEVEMENT UNLOCKED", fill=(0, 255, 150), font=font_sub)
    
    # Main Content
    draw.text((80, 280), f"CHAMPION: {name.upper()}", fill=(255, 215, 0), font=font_main)
    draw.text((80, 420), f"SCORE: {score} XP | {subject}", fill=(255, 255, 255), font=font_title)
    
    # Footer
    draw.text((80, 540), "Powered by mindgains.ai | Edu4Bharat", fill=(150, 150, 150), font=font_sub)
    draw.text((900, 540), f"RANK: {rank}", fill=(255, 100, 255), font=font_sub)

    # Save
    img.save(output_path)
    print(f"Banner saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", default="Champion")
    parser.add_argument("--score", default="0")
    parser.add_argument("--subject", default="General Studies")
    parser.add_argument("--rank", default="Top 10%")
    parser.add_argument("--output", default="banner.png")
    args = parser.parse_args()
    
    generate_banner(args.name, args.score, args.subject, args.rank, args.output)
