"""
Database module for managing brand/plastic relationships
"""
import sqlite3
import logging
from typing import Dict, List, Tuple, Optional
from contextlib import contextmanager
import os

logger = logging.getLogger(__name__)

class BrandPlasticDatabase:
    """Database manager for brand/plastic relationships"""
    
    def __init__(self, db_path: str = "brand_plastics.db"):
        self.db_path = db_path
        self.init_database()
        self.seed_initial_data()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
        finally:
            conn.close()
    
    def init_database(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create brands table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS brands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create plastics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS plastics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    brand_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (brand_id) REFERENCES brands (id),
                    UNIQUE(name, brand_id)
                )
            """)
            
            # Create brand_plastics relationship table with confidence scoring
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS brand_plastics (
                    brand_id INTEGER NOT NULL,
                    plastic_id INTEGER NOT NULL,
                    confidence_score REAL DEFAULT 1.0,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (brand_id, plastic_id),
                    FOREIGN KEY (brand_id) REFERENCES brands (id),
                    FOREIGN KEY (plastic_id) REFERENCES plastics (id)
                )
            """)
            
            # Create index for faster lookups
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_brand_plastics_confidence 
                ON brand_plastics (confidence_score DESC)
            """)
            
            conn.commit()
            logger.info("Database initialized successfully")
    
    def seed_initial_data(self):
        """Seed database with initial brand/plastic relationships"""
        initial_data = {
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
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            for brand_name, plastics in initial_data.items():
                # Insert or get brand
                cursor.execute("INSERT OR IGNORE INTO brands (name) VALUES (?)", (brand_name,))
                cursor.execute("SELECT id FROM brands WHERE name = ?", (brand_name,))
                brand_id = cursor.fetchone()['id']
                
                for plastic_name in plastics:
                    # Insert or get plastic
                    cursor.execute("""
                        INSERT OR IGNORE INTO plastics (name, brand_id) 
                        VALUES (?, ?)
                    """, (plastic_name, brand_id))
                    
                    cursor.execute("""
                        SELECT id FROM plastics WHERE name = ? AND brand_id = ?
                    """, (plastic_name, brand_id))
                    plastic_id = cursor.fetchone()['id']
                    
                    # Insert or update brand_plastics relationship
                    cursor.execute("""
                        INSERT OR IGNORE INTO brand_plastics (brand_id, plastic_id, confidence_score)
                        VALUES (?, ?, 1.0)
                    """, (brand_id, plastic_id))
            
            conn.commit()
            logger.info("Initial data seeded successfully")
    
    def get_brand_plastics_map(self, min_confidence: float = 0.5) -> Dict[str, List[str]]:
        """Get brand to plastics mapping from database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.name as brand, p.name as plastic, bp.confidence_score
                FROM brands b 
                JOIN brand_plastics bp ON b.id = bp.brand_id
                JOIN plastics p ON bp.plastic_id = p.id
                WHERE bp.confidence_score >= ?
                ORDER BY b.name, bp.confidence_score DESC
            """, (min_confidence,))
            
            result = {}
            for row in cursor.fetchall():
                brand = row['brand']
                plastic = row['plastic']
                if brand not in result:
                    result[brand] = []
                result[brand].append(plastic)
            
            return result
    
    def learn_brand_plastic_relationship(self, brand_name: str, plastic_name: str, confidence_boost: float = 0.1):
        """Learn or update a brand/plastic relationship"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Insert or get brand
            cursor.execute("INSERT OR IGNORE INTO brands (name) VALUES (?)", (brand_name,))
            cursor.execute("SELECT id FROM brands WHERE name = ?", (brand_name,))
            brand_id = cursor.fetchone()['id']
            
            # Insert or get plastic
            cursor.execute("""
                INSERT OR IGNORE INTO plastics (name, brand_id) 
                VALUES (?, ?)
            """, (plastic_name, brand_id))
            
            cursor.execute("""
                SELECT id FROM plastics WHERE name = ? AND brand_id = ?
            """, (plastic_name, brand_id))
            plastic_id = cursor.fetchone()['id']
            
            # Update or insert brand_plastics relationship
            cursor.execute("""
                INSERT INTO brand_plastics (brand_id, plastic_id, confidence_score, last_seen)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(brand_id, plastic_id) 
                DO UPDATE SET 
                    confidence_score = MIN(confidence_score + ?, 1.0),
                    last_seen = CURRENT_TIMESTAMP
            """, (brand_id, plastic_id, confidence_boost, confidence_boost))
            
            conn.commit()
            logger.debug(f"Learned relationship: {brand_name} + {plastic_name} (confidence: {confidence_boost})")
    
    def get_brand_for_plastic(self, plastic_name: str) -> Optional[str]:
        """Get the most likely brand for a given plastic name"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.name as brand, bp.confidence_score
                FROM brands b 
                JOIN brand_plastics bp ON b.id = bp.brand_id
                JOIN plastics p ON bp.plastic_id = p.id
                WHERE p.name = ?
                ORDER BY bp.confidence_score DESC
                LIMIT 1
            """, (plastic_name,))
            
            row = cursor.fetchone()
            return row['brand'] if row else None
    
    def get_plastics_for_brand(self, brand_name: str) -> List[str]:
        """Get all plastics for a given brand"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.name as plastic
                FROM brands b 
                JOIN brand_plastics bp ON b.id = bp.brand_id
                JOIN plastics p ON bp.plastic_id = p.id
                WHERE b.name = ?
                ORDER BY bp.confidence_score DESC
            """, (brand_name,))
            
            return [row['plastic'] for row in cursor.fetchall()]
    
    def get_all_brands(self) -> List[str]:
        """Get all brand names"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM brands ORDER BY name")
            return [row['name'] for row in cursor.fetchall()]
    
    def get_all_plastics(self) -> List[str]:
        """Get all plastic names"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT name FROM plastics ORDER BY name")
            return [row['name'] for row in cursor.fetchall()]

# Global database instance
db = BrandPlasticDatabase()
