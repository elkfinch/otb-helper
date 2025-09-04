# OTB Helper

A modern web application built with FastAPI, featuring a clean UI and robust backend architecture.

## Features

- 🥏 **Disc Golf Disc Search** - Search and filter discs from OTB Discs
- ⚡ **FastAPI** - Modern, fast web framework for building APIs
- 🕷️ **Web Scraping** - Real-time data from otbdiscs.com
- 🔍 **Advanced Filtering** - Filter by brand, weight, color, price, and more
- 🎨 **Beautiful UI** - Modern, responsive design with Tailwind CSS
- 📊 **Detailed Results** - Complete disc specifications and pricing
- 🔧 **Development Ready** - Hot reload, automatic API docs, and more
- 🧪 **Comprehensive Testing** - Full test suite included
- 📝 **API Documentation** - Auto-generated interactive docs at `/docs`

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd /Users/maxmclay/code/otb-helper
   ```

2. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env file with your configuration
   ```

5. **Run the application:**
   ```bash
   # Option 1: Using uvicorn directly
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Option 2: Using Python
   python -m app.main
   ```

6. **Open your browser:**
   - Application: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Alternative API docs: http://localhost:8000/redoc

## Project Structure

```
otb-helper/
├── app/
│   ├── __init__.py
│   └── main.py              # FastAPI application and routes
├── static/
│   ├── css/
│   │   └── style.css        # Custom styles
│   └── js/
│       └── main.js          # JavaScript functionality
├── templates/
│   └── index.html           # Jinja2 templates
├── tests/                   # Test files
├── requirements.txt         # Python dependencies
├── .gitignore              # Git ignore rules
├── env.example             # Environment variables template
└── README.md               # This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/`      | Home page with disc search interface |
| GET    | `/health` | Health check endpoint |
| GET    | `/api/info` | Application information |
| POST   | `/api/search` | Search discs with JSON payload |
| GET    | `/api/search` | Search discs with URL parameters |
| GET    | `/docs`  | Interactive API documentation |

### Disc Search Examples

**Simple Search:**
```bash
curl "http://localhost:8000/api/search?product_name=Destroyer"
```

**Advanced Search with Filters:**
```bash
curl "http://localhost:8000/api/search?product_name=Buzzz&brand=Discraft&weight_min=175&weight_max=180&color=Blue"
```

**POST Request:**
```bash
curl -X POST "http://localhost:8000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Firebird",
    "filters": {
      "brand": "Innova",
      "plastic_type": "Champion",
      "weight_min": 170,
      "weight_max": 175
    }
  }'
```

## Development

### Running Tests

```bash
# Install test dependencies (already in requirements.txt)
pip install pytest pytest-asyncio

# Run tests
pytest
```

### Adding New Features

1. **API Routes**: Add new endpoints in `app/main.py`
2. **Frontend**: Update templates in `templates/` and static files in `static/`
3. **Styling**: Modify `static/css/style.css` or use Tailwind classes
4. **JavaScript**: Add functionality to `static/js/main.js`

### Environment Variables

Create a `.env` file based on `env.example`:

```bash
APP_NAME=OTB Helper
APP_VERSION=1.0.0
DEBUG=True
HOST=0.0.0.0
PORT=8000
```

## Technologies Used

- **Backend**: FastAPI, Uvicorn, Pydantic
- **Web Scraping**: BeautifulSoup4, Requests, Selenium, Fake UserAgent
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Template Engine**: Jinja2
- **Testing**: Pytest, unittest.mock
- **Development**: Python 3.8+, pip

## Available Filters

The application supports comprehensive filtering options:

- **Text Filters**: Brand, Mold, Plastic Type, Color, Rim Color, Stamp Foil
- **Range Filters**: Weight, Scaled Weight, Flatness, Stiffness, Price
- **Stock Status**: In Stock, Out of Stock, Limited, Unknown
- **Sorting**: Sort by any field (price, weight, etc.) in ascending or descending order

## Next Steps

Here are some ideas for extending your OTB Helper application:

1. **Caching**: Add Redis for caching search results
2. **Database**: Store popular searches and disc data
3. **User Profiles**: Save favorite discs and search preferences  
4. **Price Tracking**: Monitor price changes over time
5. **Inventory Alerts**: Notify when out-of-stock discs become available
6. **Comparison Tool**: Side-by-side disc comparisons
7. **Mobile App**: React Native or Flutter mobile version
8. **Deployment**: Docker containerization and cloud deployment

## Important Notes

- **Respectful Scraping**: The scraper includes rate limiting and proper headers
- **Error Handling**: Robust error handling for network issues
- **Testing**: Comprehensive test suite with mocked external dependencies
- **Compliance**: Ensure you comply with OTB Discs' terms of service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
