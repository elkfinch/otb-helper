#!/usr/bin/env python3
"""
Test script for OTB Discs scraping functionality
"""

import sys
import os
import asyncio
import json
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.scraper import OTBDiscsScraper

async def test_insanity_page():
    """Test scraping the Insanity product page"""
    print("🧪 Testing OTB Discs Scraper with Insanity Product Page")
    print("=" * 60)
    
    scraper = OTBDiscsScraper()
    
    try:
        # Test URL from the provided example
        test_url = "https://otbdiscs.com/product/insanity/?srsltid=AfmBOoqI1sAqA9DNMTMFCe2Zw3Z-rgfqEHynKK-mR7kuKAG0y8TaGtyL"
        
        print(f"📡 Scraping URL: {test_url}")
        print()
        
        # Parse the product page
        discs = scraper.parse_product_page(test_url)
        
        print(f"✅ Found {len(discs)} disc variants")
        print()
        
        if discs:
            print("🥏 Disc Details:")
            print("=" * 120)
            
            # Table header
            header = f"{'#':<3} {'Brand':<8} {'Mold':<15} {'Plastic':<12} {'Color':<10} {'Weight':<7} {'Flat':<4} {'Stiff':<5} {'Price':<6} {'Stock':<12} {'Stamp Foil':<15}"
            print(header)
            print("-" * 120)
            
            # Show first 10 discs in table format
            for i, disc in enumerate(discs[:10], 1):
                weight_str = f"{disc.weight}g" if disc.weight else "N/A"
                flat_str = str(disc.flatness) if disc.flatness else "N/A"
                stiff_str = str(disc.stiffness) if disc.stiffness else "N/A"
                price_str = f"${disc.price}" if disc.price else "N/A"
                # Format stock status more cleanly
                if disc.stock:
                    stock_str = str(disc.stock.value).replace('_', ' ').title()
                else:
                    stock_str = "Unknown"
                stamp_str = (disc.stamp_foil[:14] + "...") if disc.stamp_foil and len(disc.stamp_foil) > 14 else (disc.stamp_foil or "N/A")
                color_str = (disc.color[:9] + "...") if disc.color and len(disc.color) > 9 else (disc.color or "N/A")
                mold_str = (disc.mold[:14] + "...") if disc.mold and len(disc.mold) > 14 else (disc.mold or "N/A")
                plastic_str = (disc.plastic_type[:11] + "...") if disc.plastic_type and len(disc.plastic_type) > 11 else (disc.plastic_type or "N/A")
                
                row = f"{i:<3} {disc.brand:<8} {mold_str:<15} {plastic_str:<12} {color_str:<10} {weight_str:<7} {flat_str:<4} {stiff_str:<5} {price_str:<6} {stock_str:<12} {stamp_str:<15}"
                print(row)
            
            if len(discs) > 10:
                print("-" * 120)
                print(f"... and {len(discs) - 10} more variants")
                print()
            
            # Test the filtering functionality
            print("🔍 Testing Filters:")
            print("-" * 20)
            
            # Test weight filter
            heavy_discs = [d for d in discs if d.weight and d.weight >= 170]
            print(f"   Discs ≥170g: {len(heavy_discs)}")
            
            # Test color filter
            purple_discs = [d for d in discs if d.color and 'purple' in d.color.lower()]
            print(f"   Purple discs: {len(purple_discs)}")
            
            # Test price range
            mid_price = [d for d in discs if d.price and 15.00 <= float(d.price) <= 16.00]
            print(f"   $15-16 range: {len(mid_price)}")
            
            # Test stock status
            in_stock = [d for d in discs if d.stock.value == "in_stock"]
            print(f"   In stock: {len(in_stock)}")
            
        else:
            print("❌ No discs found - there may be an issue with the scraper")
            return False
        
        print()
        print("✅ Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        scraper.close()

async def test_api_compatibility():
    """Test that scraped data works with our API models"""
    print("\n🔧 Testing API Model Compatibility")
    print("=" * 35)
    
    scraper = OTBDiscsScraper()
    
    try:
        test_url = "https://otbdiscs.com/product/insanity/?srsltid=AfmBOoqI1sAqA9DNMTMFCe2Zw3Z-rgfqEHynKK-mR7kuKAG0y8TaGtyL"
        discs = scraper.parse_product_page(test_url)
        
        if discs:
            # Test that all discs can be serialized (important for API responses)
            for disc in discs[:3]:  # Test first 3
                disc_dict = disc.model_dump()
                print(f"✅ {disc.brand} {disc.mold} serializes correctly")
            
            # Test JSON serialization
            import json
            from decimal import Decimal
            
            class DecimalEncoder(json.JSONEncoder):
                def default(self, obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    return super().default(obj)
            
            sample_disc = discs[0]
            json_str = json.dumps(sample_disc.model_dump(), cls=DecimalEncoder, indent=2)
            print(f"✅ JSON serialization works (sample length: {len(json_str)} chars)")
            
        return True
        
    except Exception as e:
        print(f"❌ API compatibility test failed: {e}")
        return False
        
    finally:
        scraper.close()

def main():
    """Run all tests"""
    print("🎯 OTB Helper - Disc Golf Scraper Test Suite")
    print("=" * 50)
    print()
    
    async def run_tests():
        success1 = await test_insanity_page()
        success2 = await test_api_compatibility()
        
        print("\n" + "=" * 50)
        if success1 and success2:
            print("🎉 All tests passed! The scraper is working correctly.")
            print()
            print("Next steps:")
            print("1. Start the FastAPI server: uvicorn app.main:app --reload")
            print("2. Test the API at: http://localhost:8000/docs")
            print("3. Try the new /api/test-url endpoint")
        else:
            print("❌ Some tests failed. Check the output above for details.")
        
        return success1 and success2
    
    return asyncio.run(run_tests())

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
