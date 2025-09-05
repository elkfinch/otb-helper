from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from typing import Optional
import time
import asyncio
import logging

from .models import SearchRequest, SearchResponse, DiscFilter, Disc
from .scraper import OTBDiscsScraper
from .filters import DiscFilterService
from .database import db

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OTB Helper - Disc Golf Disc Finder",
    description="Search and filter disc golf discs from OTB Discs",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Global scraper instance
scraper = OTBDiscsScraper()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Home page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "OTB Helper is running!"}

@app.get("/api/info")
async def get_info():
    """Get application info"""
    return {
        "name": "OTB Helper - Disc Golf Disc Finder",
        "version": "1.0.0",
        "description": "Search and filter disc golf discs from OTB Discs"
    }

@app.post("/api/search", response_model=SearchResponse)
async def search_discs(search_request: SearchRequest):
    """
    Search for disc golf discs and apply filters
    """
    start_time = time.time()
    
    try:
        logger.info(f"Searching for discs: {search_request.product_name}")
        
        # Perform the search
        discs = await asyncio.get_event_loop().run_in_executor(
            None, 
            scraper.search_discs, 
            search_request.product_name, 
            search_request.max_results
        )
        
        # Apply filters if provided
        if search_request.filters:
            discs = DiscFilterService.apply_filters(discs, search_request.filters)
        
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        response = SearchResponse(
            query=search_request.product_name,
            total_found=len(discs),
            results=discs,
            filters_applied=search_request.filters,
            search_time_ms=round(search_time, 2)
        )
        
        logger.info(f"Search completed in {search_time:.2f}ms, found {len(discs)} discs")
        return response
        
    except Exception as e:
        logger.error(f"Error during search: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/api/search", response_model=SearchResponse)
async def search_discs_get(
    product_name: str,
    max_results: Optional[int] = 50,
    # Filter parameters
    brand: Optional[str] = None,
    mold: Optional[str] = None,
    plastic_type: Optional[str] = None,
    plastic_color: Optional[str] = None,
    rim_color: Optional[str] = None,
    stamp_foil: Optional[str] = None,
    weight_min: Optional[float] = None,
    weight_max: Optional[float] = None,
    scaled_weight_min: Optional[float] = None,
    scaled_weight_max: Optional[float] = None,
    flatness_min: Optional[float] = None,
    flatness_max: Optional[float] = None,
    stiffness_min: Optional[float] = None,
    stiffness_max: Optional[float] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    sort_by: Optional[str] = "price",
    sort_order: Optional[str] = "asc"
):
    """
    Search for disc golf discs with URL parameters (GET version)
    """
    
    # Build filters from query parameters
    filters = DiscFilter(
        brand=brand,
        mold=mold,
        plastic_type=plastic_type,
        plastic_color=plastic_color,
        rim_color=rim_color,
        stamp_foil=stamp_foil,
        weight_min=weight_min,
        weight_max=weight_max,
        scaled_weight_min=scaled_weight_min,
        scaled_weight_max=scaled_weight_max,
        flatness_min=flatness_min,
        flatness_max=flatness_max,
        stiffness_min=stiffness_min,
        stiffness_max=stiffness_max,
        price_min=price_min,
        price_max=price_max,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Create search request
    search_request = SearchRequest(
        product_name=product_name,
        filters=filters,
        max_results=max_results
    )
    
    return await search_discs(search_request)

@app.post("/api/test-url", response_model=SearchResponse)
async def test_specific_url(url_request: dict):
    """
    Test scraping a specific OTB Discs product URL
    """
    start_time = time.time()
    
    try:
        url = url_request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        logger.info(f"Testing URL: {url}")
        
        # Parse the specific product page
        discs = await asyncio.get_event_loop().run_in_executor(
            None, 
            scraper.parse_product_page, 
            url
        )
        
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        response = SearchResponse(
            query=f"URL: {url}",
            total_found=len(discs),
            results=discs,
            filters_applied=None,
            search_time_ms=round(search_time, 2)
        )
        
        logger.info(f"URL test completed in {search_time:.2f}ms, found {len(discs)} discs")
        return response
        
    except Exception as e:
        logger.error(f"Error during URL test: {e}")
        raise HTTPException(status_code=500, detail=f"URL test failed: {str(e)}")

@app.get("/api/brand-plastics")
async def get_brand_plastics():
    """Get current brand/plastic relationships from database"""
    try:
        brand_plastics = db.get_brand_plastics_map()
        return {
            "brand_plastics": brand_plastics,
            "total_brands": len(brand_plastics),
            "total_plastics": sum(len(plastics) for plastics in brand_plastics.values())
        }
    except Exception as e:
        logger.error(f"Error getting brand plastics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get brand plastics: {str(e)}")

@app.get("/api/brand-plastics/{brand_name}")
async def get_plastics_for_brand(brand_name: str):
    """Get all plastics for a specific brand"""
    try:
        plastics = db.get_plastics_for_brand(brand_name)
        return {
            "brand": brand_name,
            "plastics": plastics,
            "count": len(plastics)
        }
    except Exception as e:
        logger.error(f"Error getting plastics for brand {brand_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get plastics for brand: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    scraper.close()

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
