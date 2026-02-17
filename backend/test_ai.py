import asyncio
import os
import json
from dotenv import load_dotenv

load_dotenv()

from app.services.ai_service import analyze_clothing_image

async def test():
    # Find first image in uploads
    uploads = "uploads"
    files = [f for f in os.listdir(uploads) if f.endswith(('.jpg', '.jpeg', '.png'))]
    if not files:
        print("No images in uploads/")
        return
    
    filepath = os.path.join(uploads, files[0])
    print(f"Testing with: {filepath}")
    
    with open(filepath, 'rb') as f:
        img = f.read()
    
    result = await analyze_clothing_image(img)
    
    print(f"\n{'='*60}")
    print(f"PRIMARY: {result.get('type')} | {result.get('couleur_dominante')} | {result.get('textile')}")
    print(f"STYLE: {result.get('style')} | COUPE: {result.get('coupe')}")
    print(f"{'='*60}")
    
    tags = json.loads(result.get('tags_ia', '{}'))
    items = tags.get('items', [])
    print(f"\n{len(items)} piece(s) detectee(s):\n")
    
    for i, item in enumerate(items):
        print(f"--- Piece {i+1}: {item.get('type')} ---")
        print(f"  Couleur: {item.get('couleur_dominante')}")
        print(f"  Textile: {item.get('textile')}")
        print(f"  Description: {item.get('description', '')[:200]}")
        print(f"  Conseils: {item.get('conseils_combinaison', '')[:200]}")
        recs = item.get('produits_recommandes', [])
        if recs:
            print(f"  Recommandations:")
            for r in recs:
                print(f"    -> {r.get('nom')} | {r.get('marque')} | {r.get('prix_estime')}")
        print()

asyncio.run(test())
