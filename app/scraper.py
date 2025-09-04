import requests
from bs4 import BeautifulSoup
from typing import List, Optional
import re
import time
from urllib.parse import urljoin, quote_plus
from fake_useragent import UserAgent
from decimal import Decimal
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from .models import Disc, StockStatus

logger = logging.getLogger(__name__)

class OTBDiscsScraper:
    """Scraper for OTB Discs website"""
    
    def __init__(self):
        self.base_url = "https://otbdiscs.com"
        self.session = requests.Session()
        self.ua = UserAgent()
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
    def search_discs(self, product_name: str, max_results: int = 50) -> List[Disc]:
        """
        Search for discs on OTB Discs website
        
        Args:
            product_name: Name of the disc to search for
            max_results: Maximum number of results to return
            
        Returns:
            List of Disc objects
        """
        try:
            search_url = f"{self.base_url}/?s={quote_plus(product_name)}&post_type=product"
            logger.info(f"Searching for '{product_name}' at {search_url}")
            
            response = self.session.get(search_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find product containers - OTB uses li elements with class 'product'
            products = soup.find_all('li', class_='product')[:max_results]
            
            all_discs = []
            relevant_products = []
            
            # First pass: filter relevant products
            for product in products:
                disc = self._parse_product(product)
                if disc and self._is_relevant_match(disc.mold, product_name):
                    relevant_products.append(disc)
            
            logger.info(f"Found {len(relevant_products)} relevant product pages (filtered from {len(products)} total results)")
            
            # Second pass: get detailed disc variants from each relevant product page (concurrent)
            products_with_urls = [p for p in relevant_products if p.product_url]
            products_without_urls = [p for p in relevant_products if not p.product_url]
            
            if products_with_urls:
                logger.info(f"Fetching detailed variants concurrently for {len(products_with_urls)} product pages...")
                
                # Use ThreadPoolExecutor for concurrent fetching
                max_workers = min(len(products_with_urls), 5)  # Limit to 5 concurrent requests max
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    # Submit all tasks
                    future_to_product = {
                        executor.submit(self._fetch_product_variants, product.product_url, product): product
                        for product in products_with_urls
                    }
                    
                    # Collect results as they complete
                    for future in as_completed(future_to_product):
                        product = future_to_product[future]
                        try:
                            detailed_discs = future.result()
                            all_discs.extend(detailed_discs)
                            logger.info(f"✓ Completed fetching variants for {product.mold} ({len(detailed_discs)} discs)")
                        except Exception as e:
                            logger.error(f"✗ Error fetching variants for {product.mold}: {e}")
                            # If individual page fails, add the summary disc as fallback
                            all_discs.append(product)
            
            # Add products without URLs as summary discs
            all_discs.extend(products_without_urls)
                    
            logger.info(f"Found {len(all_discs)} total individual discs for '{product_name}'")
            return all_discs
            
        except Exception as e:
            logger.error(f"Error searching for discs: {e}")
            return []
    
    def _fetch_product_variants(self, url: str, product_summary: 'Disc') -> List[Disc]:
        """
        Fetch detailed variants for a single product page (used by ThreadPoolExecutor)
        
        Args:
            url: Product page URL to fetch
            product_summary: Summary disc object for context
            
        Returns:
            List of detailed Disc objects from the product page
        """
        try:
            logger.info(f"Fetching detailed variants for: {product_summary.mold} ({product_summary.plastic_type})")
            return self.parse_product_page(url)
        except Exception as e:
            logger.error(f"Error fetching variants from {url}: {e}")
            return []
    
    def parse_product_page(self, url: str) -> List[Disc]:
        """
        Parse a specific OTB Discs product page for all disc variants
        
        Args:
            url: URL of the product page to parse
            
        Returns:
            List of Disc objects found on the page
        """
        try:
            logger.info(f"Parsing product page: {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic product info
            title_element = soup.find('h1')
            if not title_element:
                logger.error("Could not find product title")
                return []
            
            title = title_element.get_text(strip=True)
            brand, mold, plastic_type = self._parse_product_name(title)
            
            # Find the product variants table (the one with actual disc data)
            discs = []
            tables = soup.find_all('table')
            
            # Look for the table with disc variants (should have columns like Color, Weight, Price, Stock)
            variants_table = None
            for table in tables:
                header_row = table.find('tr')
                if header_row:
                    headers = [th.get_text(strip=True).lower() for th in header_row.find_all(['th', 'td'])]
                    # Check if this table has the columns we need
                    if any('weight' in h for h in headers) and any('price' in h for h in headers):
                        variants_table = table
                        logger.info(f"Found variants table with headers: {headers}")
                        break
            
            if variants_table:
                rows = variants_table.find_all('tr')[1:]  # Skip header row
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 10:  # Make sure we have enough columns
                        try:
                            disc = self._parse_table_row(cells, brand, mold, plastic_type, url)
                            if disc:
                                discs.append(disc)
                        except Exception as e:
                            logger.error(f"Error parsing table row: {e}")
                            continue
            else:
                logger.warning("Could not find variants table with expected columns")
            
            logger.info(f"Found {len(discs)} disc variants")
            return discs
            
        except Exception as e:
            logger.error(f"Error parsing product page {url}: {e}")
            return []
    
    def _parse_table_row(self, cells, brand: str, mold: str, plastic_type: str, product_url: str) -> Optional[Disc]:
        """
        Parse a table row from OTB Discs product page into a Disc object
        
        Args:
            cells: List of table cell elements
            brand: Brand name
            mold: Mold name  
            plastic_type: Plastic type
            product_url: URL of the product page
            
        Returns:
            Disc object or None if parsing fails
        """
        try:
            # Based on the actual OTB Discs table structure from HTML analysis:
            # 0=Thumbnail, 1=Color, 2=Plastic-Gateway, 3=Stamp Foil, 4=Weight, 5=Scaled Weight, 
            # 6=Flatness, 7=Stiffness, 8=Price, 9=Stock, 10=Quantity, 11=Add to cart
            
            color = cells[1].get_text(strip=True) if len(cells) > 1 else None
            
            # Get plastic type from column 2 (Plastic-Gateway)
            plastic_from_table = cells[2].get_text(strip=True) if len(cells) > 2 else None
            if plastic_from_table and plastic_from_table.strip():
                plastic_type = plastic_from_table
            
            stamp_foil = cells[3].get_text(strip=True) if len(cells) > 3 else None
            rim_color = None  # Not in this table format
            
            # Parse weight from column 4 (Weight: "174g")
            weight = None
            if len(cells) > 4:
                weight_text = cells[4].get_text(strip=True)
                weight_match = re.search(r'(\d+)', weight_text)
                if weight_match:
                    weight = float(weight_match.group(1))
            
            # Parse scaled weight from column 5 (Scaled Weight: "174.3g")
            scaled_weight = None
            if len(cells) > 5:
                scaled_weight_text = cells[5].get_text(strip=True)
                scaled_match = re.search(r'(\d+(?:\.\d+)?)', scaled_weight_text)
                if scaled_match:
                    scaled_weight = float(scaled_match.group(1))
            
            # Parse flatness from column 6 (Flatness: "(3) - Somewhat Flat")
            flatness = None
            if len(cells) > 6:
                flatness_text = cells[6].get_text(strip=True)
                flatness_match = re.search(r'\((\d+)\)', flatness_text)
                if flatness_match:
                    flatness = float(flatness_match.group(1))
            
            # Parse stiffness from column 7 (Stiffness: "(3) - Somewhat Gummy")
            stiffness = None
            if len(cells) > 7:
                stiffness_text = cells[7].get_text(strip=True)
                stiffness_match = re.search(r'\((\d+)\)', stiffness_text)
                if stiffness_match:
                    stiffness = float(stiffness_match.group(1))
            
            # Parse price from column 8 (Price: "$17.99")
            price = None
            if len(cells) > 8:
                price_text = cells[8].get_text(strip=True)
                price_match = re.search(r'\$(\d+(?:\.\d+)?)', price_text)
                if price_match:
                    price = Decimal(price_match.group(1))
            
            # Parse stock status from column 9 (Stock: "Just 1 left!")
            stock_status = StockStatus.UNKNOWN
            if len(cells) > 9:
                stock_text = cells[9].get_text(strip=True).lower()
                if 'just 1 left' in stock_text or 'in stock' in stock_text:
                    stock_status = StockStatus.IN_STOCK
                elif 'out of stock' in stock_text:
                    stock_status = StockStatus.OUT_OF_STOCK
                elif 'limited' in stock_text:
                    stock_status = StockStatus.LIMITED
            
            # Get image URL from thumbnail cell
            image_url = None
            if len(cells) > 0:
                img_element = cells[0].find('img')
                if img_element and img_element.get('src'):
                    image_url = img_element['src']
            
            disc = Disc(
                brand=brand,
                mold=mold,
                plastic_type=plastic_type,
                color=color,
                rim_color=rim_color,
                stamp_foil=stamp_foil,
                weight=weight,
                scaled_weight=scaled_weight,
                flatness=flatness,
                stiffness=stiffness,
                price=price,
                stock=stock_status,
                product_url=product_url,
                image_url=image_url
            )
            
            return disc
            
        except Exception as e:
            logger.error(f"Error parsing table row: {e}")
            return None

    def _parse_product(self, product_element) -> Optional[Disc]:
        """
        Parse a single product element from search results into a Disc object
        
        Args:
            product_element: BeautifulSoup element containing product data
            
        Returns:
            Disc object or None if parsing fails
        """
        try:
            # Extract basic info - these selectors will need to be updated based on actual HTML
            name_element = product_element.find('h2', class_='woocommerce-loop-product__title')
            price_element = product_element.find('span', class_='woocommerce-Price-amount')
            link_element = product_element.find('a')
            
            if not name_element:
                return None
                
            name = name_element.get_text(strip=True)
            
            # Parse product name to extract brand, mold, plastic
            brand, mold, plastic_type = self._parse_product_name(name)
            
            # Extract price
            price = None
            if price_element:
                price_text = price_element.get_text(strip=True)
                price_match = re.search(r'[\d.]+', price_text.replace(',', ''))
                if price_match:
                    price = Decimal(price_match.group())
            
            # Extract product URL
            product_url = None
            if link_element and link_element.get('href'):
                product_url = urljoin(self.base_url, link_element['href'])
            
            disc = Disc(
                brand=brand,
                mold=mold,
                plastic_type=plastic_type,
                price=price,
                product_url=product_url
            )
            
            return disc
            
        except Exception as e:
            logger.error(f"Error parsing product: {e}")
            return None
    
    def _parse_product_name(self, name: str) -> tuple:
        """
        Parse product name to extract brand, mold, and plastic type
        
        Args:
            name: Product name string (e.g., "Proton Insanity")
            
        Returns:
            Tuple of (brand, mold, plastic_type)
        """
        # Common disc golf brands and their associated plastics
        brand_plastics = {
            'Innova': ['Champion', 'Star', 'DX', 'Pro', 'XT', 'Metal Flake', 'Glow', 'Halo Star'],
            'Discraft': ['ESP', 'Z', 'Pro-D', 'Big Z', 'Titanium', 'Glo Z', 'Cryztal', 'Swirl ESP'],
            'MVP': ['Neutron', 'Proton', 'Plasma', 'Fission', 'Eclipse'],
            'Axiom': ['Neutron', 'Proton', 'Plasma', 'Fission', 'Eclipse', 'Cosmic Neutron'],
            'Streamline': ['Neutron', 'Proton', 'Plasma', 'Cosmic Neutron'],
            'Dynamic Discs': ['Lucid', 'Fuzion', 'Prime', 'Classic', 'BioFuzion'],
            'Latitude 64': ['Opto', 'Gold', 'Retro', 'Zero'],
            'Westside': ['VIP', 'Tournament', 'Elasto'],
            'Prodigy': ['400', '400G', '300', '500', '750'],
            'Kastaplast': ['K1', 'K2', 'K3', 'Glow'],
            'Gateway': ['Diamond', 'Platinum', 'Sure Grip', 'Evolution'],
            'DGA': ['SP Line', 'Proline', 'Signature'],
            'Millennium': ['Standard', 'Quantum', 'Sirius']
        }
        
        name_lower = name.lower()
        
        # Try to identify brand and plastic
        brand = "Unknown"
        plastic_type = "Unknown"
        mold = "Unknown"
        
        # First, try to identify by plastic type (which often indicates brand)
        for brand_name, plastics in brand_plastics.items():
            for plastic in plastics:
                if plastic.lower() in name_lower:
                    brand = brand_name
                    plastic_type = plastic
                    # Remove both brand and plastic from name to get mold
                    remaining = name.replace(brand_name, '').replace(plastic, '').strip()
                    if remaining:
                        mold = remaining
                    return brand, mold, plastic_type
        
        # If no plastic found, try to identify brand directly
        for brand_name in brand_plastics.keys():
            if brand_name.lower() in name_lower:
                brand = brand_name
                # Remove brand from name for further processing
                name = name.replace(brand_name, '').strip()
                break
        
        # Extract mold (usually the last significant word)
        name_parts = [part for part in name.split() if part.lower() not in ['disc', 'golf']]
        if name_parts:
            if plastic_type == "Unknown" and brand == "Unknown" and len(name_parts) >= 3:
                # Format: {Brand} {Plastic} {Mold}
                brand = name_parts[0]
                plastic_type = name_parts[1]
                mold = ' '.join(name_parts[2:])
            elif plastic_type == "Unknown" and len(name_parts) > 1:
                plastic_type = name_parts[0]
                mold = ' '.join(name_parts[1:])
            else:
                mold = name_parts[-1]
        
        return brand, mold, plastic_type
    
    def _is_relevant_match(self, mold_name: str, search_term: str) -> bool:
        """
        Check if a disc mold is a relevant match for the search term
        
        Args:
            mold_name: The mold name from the parsed disc
            search_term: The original search term
            
        Returns:
            True if the disc is a relevant match, False otherwise
        """
        if not mold_name or not search_term:
            return False
            
        mold_lower = mold_name.lower().strip()
        search_lower = search_term.lower().strip()
        
        # Split both into words for more precise matching
        mold_words = mold_lower.split()
        search_words = search_lower.split()
        
        # For single-word searches, look for the word in the mold name
        if len(search_words) == 1:
            search_word = search_words[0]
            
            # Check if any word in the mold contains or matches the search term
            for word in mold_words:
                if (search_word == word or 
                    word.startswith(search_word) or 
                    word.endswith(search_word)):
                    return True
                    
        # For multi-word searches, require all words to be present
        else:
            mold_text = ' '.join(mold_words)
            for search_word in search_words:
                if search_word not in mold_text:
                    return False
            return True
                
        return False
    
    def _get_detailed_properties(self, product_url: str) -> dict:
        """
        Get detailed properties from individual product page
        
        Args:
            product_url: URL of the product page
            
        Returns:
            Dictionary of detailed properties
        """
        try:
            response = self.session.get(product_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            details = {}
            
            # Look for product details table or similar structure
            # This will need to be customized based on OTB Discs' actual HTML structure
            details_table = soup.find('table', class_='shop_attributes')
            
            if details_table:
                rows = details_table.find_all('tr')
                for row in rows:
                    label = row.find('th')
                    value = row.find('td')
                    
                    if label and value:
                        label_text = label.get_text(strip=True).lower()
                        value_text = value.get_text(strip=True)
                        
                        # Map labels to our model fields
                        if 'color' in label_text and 'rim' not in label_text:
                            details['color'] = value_text
                        elif 'rim color' in label_text:
                            details['rim_color'] = value_text
                        elif 'stamp' in label_text or 'foil' in label_text:
                            details['stamp_foil'] = value_text
                        elif 'weight' in label_text and 'scaled' not in label_text:
                            weight_match = re.search(r'(\d+(?:\.\d+)?)', value_text)
                            if weight_match:
                                details['weight'] = float(weight_match.group(1))
                        elif 'scaled weight' in label_text:
                            weight_match = re.search(r'(\d+(?:\.\d+)?)', value_text)
                            if weight_match:
                                details['scaled_weight'] = float(weight_match.group(1))
                        elif 'flatness' in label_text:
                            flatness_match = re.search(r'(\d+(?:\.\d+)?)', value_text)
                            if flatness_match:
                                details['flatness'] = float(flatness_match.group(1))
                        elif 'stiffness' in label_text:
                            stiffness_match = re.search(r'(\d+(?:\.\d+)?)', value_text)
                            if stiffness_match:
                                details['stiffness'] = float(stiffness_match.group(1))
            
            # Check stock status
            stock_element = soup.find('p', class_='stock')
            if stock_element:
                stock_text = stock_element.get_text(strip=True).lower()
                if 'in stock' in stock_text:
                    details['stock'] = StockStatus.IN_STOCK
                elif 'out of stock' in stock_text:
                    details['stock'] = StockStatus.OUT_OF_STOCK
                else:
                    details['stock'] = StockStatus.UNKNOWN
            
            # Get image URL
            image_element = soup.find('div', class_='woocommerce-product-gallery__image')
            if image_element:
                img = image_element.find('img')
                if img and img.get('src'):
                    details['image_url'] = img['src']
            
            return details
            
        except Exception as e:
            logger.error(f"Error getting detailed properties from {product_url}: {e}")
            return {}
    
    def display_discs_table(self, discs: List[Disc], max_rows: int = 20, title: str = "Disc Search Results") -> None:
        """
        Display discs in a formatted table view
        
        Args:
            discs: List of Disc objects to display
            max_rows: Maximum number of rows to show
            title: Title for the table
        """
        if not discs:
            print("No discs found.")
            return
            
        print(f"\n🥏 {title}")
        print("=" * 140)
        
        # Table header
        header = f"{'#':<3} {'Brand':<8} {'Mold':<15} {'Plastic':<12} {'Color':<12} {'Weight':<8} {'Flat':<4} {'Stiff':<5} {'Price':<7} {'Stock':<12} {'Stamp Foil':<20}"
        print(header)
        print("-" * 140)
        
        # Table rows
        for i, disc in enumerate(discs[:max_rows], 1):
            # Format values with proper truncation and null handling
            weight_str = f"{disc.weight}g" if disc.weight else "N/A"
            flat_str = str(disc.flatness) if disc.flatness else "N/A"
            stiff_str = str(disc.stiffness) if disc.stiffness else "N/A"
            price_str = f"${disc.price}" if disc.price else "N/A"
            # Format stock status more cleanly
            if disc.stock:
                stock_str = str(disc.stock.value).replace('_', ' ').title()
            else:
                stock_str = "Unknown"
            
            # Truncate long strings
            mold_str = (disc.mold[:14] + "...") if disc.mold and len(disc.mold) > 14 else (disc.mold or "N/A")
            plastic_str = (disc.plastic_type[:11] + "...") if disc.plastic_type and len(disc.plastic_type) > 11 else (disc.plastic_type or "N/A")
            color_str = (disc.color[:11] + "...") if disc.color and len(disc.color) > 11 else (disc.color or "N/A")
            stamp_str = (disc.stamp_foil[:19] + "...") if disc.stamp_foil and len(disc.stamp_foil) > 19 else (disc.stamp_foil or "N/A")
            
            row = f"{i:<3} {disc.brand:<8} {mold_str:<15} {plastic_str:<12} {color_str:<12} {weight_str:<8} {flat_str:<4} {stiff_str:<5} {price_str:<7} {stock_str:<12} {stamp_str:<20}"
            print(row)
        
        if len(discs) > max_rows:
            print("-" * 140)
            print(f"... and {len(discs) - max_rows} more discs (showing first {max_rows})")
        
        print("-" * 140)
        print(f"Total: {len(discs)} discs found")
        print()

    def close(self):
        """Close the session"""
        self.session.close()
