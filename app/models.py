from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Union
from enum import Enum
from decimal import Decimal

class StockStatus(str, Enum):
    IN_STOCK = "in_stock"
    OUT_OF_STOCK = "out_of_stock"
    LIMITED = "limited"
    UNKNOWN = "unknown"

class Disc(BaseModel):
    """Model representing a disc golf disc from OTB Discs"""
    
    # Basic product info
    brand: str
    mold: str
    plastic_type: str
    
    # Physical properties from OTB Discs
    plastic_color: Optional[str] = None  # Renamed from color
    rim_color: Optional[str] = None
    stamp_foil: Optional[str] = None
    weight: Optional[float] = Field(None, description="Weight in grams")
    scaled_weight: Optional[float] = Field(None, description="Scaled weight rating")
    flatness: Optional[float] = Field(None, description="Flatness rating")
    stiffness: Optional[float] = Field(None, description="Stiffness rating")
    
    # Product details
    price: Optional[Decimal] = Field(None, description="Price in USD")
    stock: StockStatus = StockStatus.UNKNOWN
    
    # Metadata
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    raw_row_text: Optional[str] = Field(None, description="Raw text from the OTB product table row for exact matching")
    
    @field_validator('weight', 'scaled_weight', 'flatness', 'stiffness')
    @classmethod
    def validate_numeric_fields(cls, v):
        if v is not None and v < 0:
            raise ValueError('Numeric fields must be non-negative')
        return v
    
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        if v is not None and v < 0:
            raise ValueError('Price must be non-negative')
        return v

class DiscFilter(BaseModel):
    """Model for filtering disc search results"""
    
    # Text filters (exact match or list of options)
    mold: Optional[Union[str, List[str]]] = None
    plastic_type: Optional[Union[str, List[str]]] = None
    plastic_color: Optional[Union[str, List[str]]] = None  # Renamed from color
    rim_color: Optional[Union[str, List[str]]] = None
    stamp_foil: Optional[Union[str, List[str]]] = None
    
    # Range filters
    weight_min: Optional[float] = Field(None, ge=0, description="Minimum weight in grams")
    weight_max: Optional[float] = Field(None, ge=0, description="Maximum weight in grams")
    scaled_weight_min: Optional[float] = Field(None, ge=0)
    scaled_weight_max: Optional[float] = Field(None, ge=0)
    flatness_min: Optional[float] = Field(None, ge=0)
    flatness_max: Optional[float] = Field(None, ge=0)
    stiffness_min: Optional[float] = Field(None, ge=0)
    stiffness_max: Optional[float] = Field(None, ge=0)
    price_min: Optional[Decimal] = Field(None, ge=0, description="Minimum price in USD")
    price_max: Optional[Decimal] = Field(None, ge=0, description="Maximum price in USD")
    
    # Stock filter
    stock: Optional[Union[StockStatus, List[StockStatus]]] = None
    
    # Sorting options
    sort_by: Optional[str] = Field("price", description="Field to sort by")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")

class SearchRequest(BaseModel):
    """Model for disc search requests"""
    product_name: str = Field(..., description="Name of the disc to search for")
    filters: Optional[DiscFilter] = None
    max_results: Optional[int] = Field(50, ge=1, le=200, description="Maximum number of results")

class SearchResponse(BaseModel):
    """Model for search response"""
    query: str
    total_found: int
    results: List[Disc]
    filters_applied: Optional[DiscFilter] = None
    search_time_ms: Optional[float] = None