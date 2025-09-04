import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.models import Disc, DiscFilter, SearchRequest, StockStatus
from app.filters import DiscFilterService
from decimal import Decimal

client = TestClient(app)

def test_read_root():
    """Test the home page endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "message" in data

def test_get_info():
    """Test the info endpoint"""
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert "OTB Helper" in data["name"]
    assert data["version"] == "1.0.0"
    assert "description" in data

def test_docs_endpoint():
    """Test that API docs are accessible"""
    response = client.get("/docs")
    assert response.status_code == 200

def test_redoc_endpoint():
    """Test that ReDoc docs are accessible"""
    response = client.get("/redoc")
    assert response.status_code == 200

@patch('app.main.scraper.search_discs')
def test_search_discs_post(mock_search):
    """Test the POST search endpoint"""
    # Mock the scraper response
    mock_disc = Disc(
        brand="Innova",
        mold="Destroyer",
        plastic_type="Champion",
        color="Blue",
        weight=175.0,
        price=Decimal("18.99"),
        stock=StockStatus.IN_STOCK
    )
    mock_search.return_value = [mock_disc]
    
    # Test data
    search_data = {
        "product_name": "Destroyer",
        "max_results": 10
    }
    
    response = client.post("/api/search", json=search_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["query"] == "Destroyer"
    assert data["total_found"] == 1
    assert len(data["results"]) == 1
    
    result = data["results"][0]
    assert result["brand"] == "Innova"
    assert result["mold"] == "Destroyer"
    assert result["plastic_type"] == "Champion"

@patch('app.main.scraper.search_discs')
def test_search_discs_get(mock_search):
    """Test the GET search endpoint"""
    mock_disc = Disc(
        brand="Discraft",
        mold="Buzzz",
        plastic_type="ESP",
        weight=178.0,
        price=Decimal("16.99")
    )
    mock_search.return_value = [mock_disc]
    
    response = client.get("/api/search?product_name=Buzzz&brand=Discraft&weight_min=175")
    assert response.status_code == 200
    
    data = response.json()
    assert data["query"] == "Buzzz"
    assert len(data["results"]) == 1

def test_search_discs_missing_name():
    """Test search endpoint with missing product name"""
    response = client.post("/api/search", json={})
    assert response.status_code == 422  # Validation error

# Test models
def test_disc_model():
    """Test Disc model validation"""
    disc = Disc(
        brand="Innova",
        mold="Destroyer",
        plastic_type="Champion",
        weight=175.0,
        price=Decimal("18.99")
    )
    
    assert disc.brand == "Innova"
    assert disc.mold == "Destroyer"
    assert disc.weight == 175.0
    assert disc.price == Decimal("18.99")

def test_disc_filter_service():
    """Test DiscFilterService filtering logic"""
    discs = [
        Disc(brand="Innova", mold="Destroyer", plastic_type="Champion", weight=175.0, price=Decimal("18.99")),
        Disc(brand="Discraft", mold="Buzzz", plastic_type="ESP", weight=178.0, price=Decimal("16.99")),
        Disc(brand="Innova", mold="Firebird", plastic_type="Champion", weight=173.0, price=Decimal("17.99"))
    ]
    
    # Test brand filter
    filters = DiscFilter(brand="Innova")
    filtered = DiscFilterService.apply_filters(discs, filters)
    assert len(filtered) == 2
    assert all(disc.brand == "Innova" for disc in filtered)
    
    # Test weight range filter
    filters = DiscFilter(weight_min=174.0, weight_max=176.0)
    filtered = DiscFilterService.apply_filters(discs, filters)
    assert len(filtered) == 1
    assert filtered[0].weight == 175.0
    
    # Test price range filter
    filters = DiscFilter(price_min=Decimal("17.00"), price_max=Decimal("18.00"))
    filtered = DiscFilterService.apply_filters(discs, filters)
    assert len(filtered) == 1
    assert filtered[0].price == Decimal("17.99")

def test_text_filter_matching():
    """Test text filter matching logic"""
    # Test exact match
    assert DiscFilterService._check_text_filter("Innova", "Innova") == True
    assert DiscFilterService._check_text_filter("Innova", "Discraft") == False
    
    # Test partial match (case insensitive)
    assert DiscFilterService._check_text_filter("Champion Plastic", "Champion") == True
    assert DiscFilterService._check_text_filter("champion plastic", "Champion") == True
    
    # Test list matching
    assert DiscFilterService._check_text_filter("Innova", ["Innova", "Discraft"]) == True
    assert DiscFilterService._check_text_filter("MVP", ["Innova", "Discraft"]) == False

def test_range_filter_matching():
    """Test range filter matching logic"""
    # Test within range
    assert DiscFilterService._check_range_filter(175.0, 170.0, 180.0) == True
    
    # Test outside range
    assert DiscFilterService._check_range_filter(165.0, 170.0, 180.0) == False
    assert DiscFilterService._check_range_filter(185.0, 170.0, 180.0) == False
    
    # Test edge cases
    assert DiscFilterService._check_range_filter(170.0, 170.0, 180.0) == True
    assert DiscFilterService._check_range_filter(180.0, 170.0, 180.0) == True
    
    # Test None values
    assert DiscFilterService._check_range_filter(175.0, None, None) == True
    assert DiscFilterService._check_range_filter(None, None, None) == True
    assert DiscFilterService._check_range_filter(None, 170.0, 180.0) == False
