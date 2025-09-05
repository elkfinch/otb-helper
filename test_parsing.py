#!/usr/bin/env python3
"""Test script to verify the new database-driven parsing logic"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.scraper import OTBDiscsScraper
from app.database import db

def test_parsing():
    scraper = OTBDiscsScraper()
    
    test_cases = [
        "Proton Insanity",
        "MVP Proton Insanity", 
        "Innova Champion Destroyer",
        "Discraft ESP Buzzz",
        "Neutron Envy",
        "Plasma Tesla"
    ]
    
    print("Testing database-driven product name parsing:")
    print("=" * 60)
    
    # Show current database state
    brand_plastics = db.get_brand_plastics_map()
    print(f"Database contains {len(brand_plastics)} brands with plastics")
    print()
    
    for name in test_cases:
        print(f"Input: '{name}'")
        brand, mold, plastic = scraper._parse_product_name(name)
        print(f"  Brand: '{brand}'")
        print(f"  Mold: '{mold}'") 
        print(f"  Plastic: '{plastic}'")
        print()

if __name__ == "__main__":
    test_parsing()
