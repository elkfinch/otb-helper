import pytest
from unittest.mock import Mock, patch
from app.scraper import OTBDiscsScraper
from app.models import Disc, StockStatus

class TestOTBDiscsScraper:
    """Test the OTB Discs scraper"""
    
    def setup_method(self):
        """Setup for each test"""
        self.scraper = OTBDiscsScraper()
    
    def teardown_method(self):
        """Cleanup after each test"""
        self.scraper.close()
    
    def test_parse_product_name(self):
        """Test product name parsing"""
        brand, mold, plastic = self.scraper._parse_product_name("Innova Champion Destroyer")
        assert brand == "Innova"
        assert mold == "Destroyer"
        assert plastic == "Champion"
        
        brand, mold, plastic = self.scraper._parse_product_name("Discraft ESP Buzzz")
        assert brand == "Discraft"
        assert mold == "Buzzz"
        assert plastic == "ESP"
        
        # Test unknown brand
        brand, mold, plastic = self.scraper._parse_product_name("Unknown Plastic TestDisc")
        assert brand == "Unknown"
        assert mold == "TestDisc"
        assert plastic == "Plastic"
    
    @patch('app.scraper.requests.Session.get')
    def test_search_discs_empty_result(self, mock_get):
        """Test search with no results"""
        # Mock empty response
        mock_response = Mock()
        mock_response.content = b'<html><body><div class="products"></div></body></html>'
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        results = self.scraper.search_discs("NonexistentDisc")
        assert results == []
    
    @patch('app.scraper.requests.Session.get')
    def test_search_discs_with_results(self, mock_get):
        """Test search with mock results"""
        # Mock HTML response with product
        mock_html = '''
        <html>
            <body>
                <div class="product">
                    <h2 class="woocommerce-loop-product__title">Innova Champion Destroyer</h2>
                    <span class="woocommerce-Price-amount">$18.99</span>
                    <a href="/product/destroyer">View Product</a>
                </div>
            </body>
        </html>
        '''
        
        mock_response = Mock()
        mock_response.content = mock_html.encode('utf-8')
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Mock the detailed properties method to return empty dict
        with patch.object(self.scraper, '_get_detailed_properties', return_value={}):
            results = self.scraper.search_discs("Destroyer")
            
            assert len(results) == 1
            disc = results[0]
            assert disc.brand == "Innova"
            assert disc.mold == "Destroyer"
            assert disc.plastic_type == "Champion"
    
    @patch('app.scraper.requests.Session.get')
    def test_get_detailed_properties(self, mock_get):
        """Test detailed properties extraction"""
        # Mock detailed product page
        mock_html = '''
        <html>
            <body>
                <table class="shop_attributes">
                    <tr>
                        <th>Color</th>
                        <td>Blue</td>
                    </tr>
                    <tr>
                        <th>Weight</th>
                        <td>175g</td>
                    </tr>
                    <tr>
                        <th>Flatness</th>
                        <td>7.5</td>
                    </tr>
                </table>
                <p class="stock">In stock</p>
                <div class="woocommerce-product-gallery__image">
                    <img src="/images/disc.jpg" />
                </div>
            </body>
        </html>
        '''
        
        mock_response = Mock()
        mock_response.content = mock_html.encode('utf-8')
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        details = self.scraper._get_detailed_properties("http://example.com/product")
        
        assert details['color'] == 'Blue'
        assert details['weight'] == 175.0
        assert details['flatness'] == 7.5
        assert details['stock'] == StockStatus.IN_STOCK
        assert details['image_url'] == '/images/disc.jpg'
    
    @patch('app.scraper.requests.Session.get')
    def test_error_handling(self, mock_get):
        """Test error handling in scraper"""
        # Mock request exception
        mock_get.side_effect = Exception("Network error")
        
        results = self.scraper.search_discs("TestDisc")
        assert results == []  # Should return empty list on error
    
    def test_close(self):
        """Test scraper cleanup"""
        # Should not raise any exceptions
        self.scraper.close()
