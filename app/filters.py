from typing import List
from .models import Disc, DiscFilter

class DiscFilterService:
    """Service for filtering disc search results"""
    
    @staticmethod
    def apply_filters(discs: List[Disc], filters: DiscFilter) -> List[Disc]:
        """
        Apply filters to a list of discs
        
        Args:
            discs: List of Disc objects to filter
            filters: DiscFilter object containing filter criteria
            
        Returns:
            Filtered list of Disc objects
        """
        if not filters:
            return discs
            
        filtered_discs = []
        
        for disc in discs:
            if DiscFilterService._matches_filters(disc, filters):
                filtered_discs.append(disc)
        
        # Apply sorting
        if filters.sort_by and hasattr(Disc, filters.sort_by):
            reverse = filters.sort_order == 'desc'
            try:
                filtered_discs.sort(
                    key=lambda d: getattr(d, filters.sort_by) or 0,
                    reverse=reverse
                )
            except (TypeError, AttributeError):
                # If sorting fails, just return unsorted results
                pass
        
        return filtered_discs
    
    @staticmethod
    def _matches_filters(disc: Disc, filters: DiscFilter) -> bool:
        """
        Check if a disc matches the given filters
        
        Args:
            disc: Disc object to check
            filters: DiscFilter object containing filter criteria
            
        Returns:
            True if disc matches all filters, False otherwise
        """
        
        # Text filters (exact match or list)
        if not DiscFilterService._check_text_filter(disc.brand, filters.brand):
            return False
        if not DiscFilterService._check_text_filter(disc.mold, filters.mold):
            return False
        if not DiscFilterService._check_text_filter(disc.plastic_type, filters.plastic_type):
            return False
        if not DiscFilterService._check_text_filter(disc.plastic_color, filters.plastic_color):
            return False
        if not DiscFilterService._check_text_filter(disc.rim_color, filters.rim_color):
            return False
        if not DiscFilterService._check_text_filter(disc.stamp_foil, filters.stamp_foil):
            return False
        
        # Range filters
        if not DiscFilterService._check_range_filter(
            disc.weight, filters.weight_min, filters.weight_max
        ):
            return False
        if not DiscFilterService._check_range_filter(
            disc.scaled_weight, filters.scaled_weight_min, filters.scaled_weight_max
        ):
            return False
        if not DiscFilterService._check_range_filter(
            disc.flatness, filters.flatness_min, filters.flatness_max
        ):
            return False
        if not DiscFilterService._check_range_filter(
            disc.stiffness, filters.stiffness_min, filters.stiffness_max
        ):
            return False
        if not DiscFilterService._check_range_filter(
            float(disc.price) if disc.price else None,
            float(filters.price_min) if filters.price_min else None,
            float(filters.price_max) if filters.price_max else None
        ):
            return False
        
        # Stock filter
        if filters.stock is not None:
            if isinstance(filters.stock, list):
                if disc.stock not in filters.stock:
                    return False
            else:
                if disc.stock != filters.stock:
                    return False
        
        return True
    
    @staticmethod
    def _check_text_filter(value: str, filter_value) -> bool:
        """
        Check if a text value matches the filter
        
        Args:
            value: The value to check
            filter_value: The filter criteria (string or list of strings)
            
        Returns:
            True if value matches filter, False otherwise
        """
        if filter_value is None:
            return True
        
        if value is None:
            return False
        
        value_lower = value.lower()
        
        if isinstance(filter_value, list):
            return any(fv.lower() in value_lower for fv in filter_value)
        else:
            return filter_value.lower() in value_lower
    
    @staticmethod
    def _check_range_filter(value: float, min_val: float, max_val: float) -> bool:
        """
        Check if a numeric value is within the specified range
        
        Args:
            value: The value to check
            min_val: Minimum value (inclusive)
            max_val: Maximum value (inclusive)
            
        Returns:
            True if value is within range, False otherwise
        """
        if value is None:
            return min_val is None and max_val is None
        
        if min_val is not None and value < min_val:
            return False
        
        if max_val is not None and value > max_val:
            return False
        
        return True
