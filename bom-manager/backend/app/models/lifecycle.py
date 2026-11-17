from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float
from datetime import datetime
from app.database import Base
from app.models.models import generate_uuid

from sqlalchemy.orm import relationship

class PartIdentityLifecycle(Base):
    """
    Tracks lifecycle data and provider lookup status explicitly mapped to an Identity Resolution IPN.
    This separates the act of identity-based lifecycle retrieval from the core global catalog (Part).
    """
    __tablename__ = "part_identity_lifecycle"

    id = Column(String, primary_key=True, default=generate_uuid)
    
    # Internal part number across lifecycle lookups (unique per part)
    internal_part_number = Column(String, nullable=False, index=True, unique=True)
    
    # Optional foreign key to identity mapping when verified
    mapping_id = Column(String, ForeignKey("part_number_mappings.id", ondelete="SET NULL"), nullable=True, index=True)
    mapping = relationship("PartNumberMapping", foreign_keys=[mapping_id])
    
    # Cached identity information to avoid deep joins when viewing lifecycle data
    manufacturer = Column(String, nullable=True)
    manufacturer_part_number = Column(String, nullable=True)

    # Lookup Tracking
    lookup_status = Column(String, default="NOT_REQUESTED") # NOT_REQUESTED, PENDING, SUCCESS, BLOCKED, FAILED
    error_reason = Column(String, nullable=True)

    # Provider Data
    provider = Column(String, nullable=True) # e.g. "MOCK"
    retrieved_at = Column(DateTime, nullable=True)
    match_type = Column(String, nullable=True) # EXACT_MATCH, VERIFIED_ALIAS
    verification_status = Column(String, nullable=True) # VERIFIED

    # Normalized Lifecycle Fields
    lifecycle_status = Column(String, nullable=True) # e.g. ACTIVE, OBSOLETE
    product_status = Column(String, nullable=True) 
    is_obsolete = Column(Boolean, nullable=True)
    is_discontinued = Column(Boolean, nullable=True)
    end_of_life_date = Column(DateTime, nullable=True)
    availability_status = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
