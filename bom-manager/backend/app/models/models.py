from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Float, Date, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user") # e.g. admin, engineer, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    boms = relationship("BOM", back_populates="uploader")
    audit_logs = relationship("AuditLog", primaryjoin="User.id==AuditLog.user_id", foreign_keys="AuditLog.user_id", back_populates="user")


class Part(Base):
    __tablename__ = "parts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_number = Column(String, unique=True, nullable=False, index=True)
    description = Column(String)
    category = Column(String) # E.g., Resistor, IC, Capacitor
    package_type = Column(String) # Package/Form Factor
    standard_cert = Column(String) # MIL, ISO, QPL, etc.
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    manufacturers = relationship("PartManufacturer", back_populates="part", cascade="all, delete-orphan")
    suppliers = relationship("PartSupplier", back_populates="part", cascade="all, delete-orphan")
    lifecycle_info = relationship("LifecycleInfo", back_populates="part", uselist=False, cascade="all, delete-orphan")
    compliance_info = relationship("ComplianceInfo", back_populates="part", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="part", cascade="all, delete-orphan")
    pcns = relationship("PCN", back_populates="part", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="part", cascade="all, delete-orphan")


class Manufacturer(Base):
    __tablename__ = "manufacturers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False, index=True)
    code = Column(String)
    country_of_origin = Column(String)
    website = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    parts = relationship("PartManufacturer", back_populates="manufacturer", cascade="all, delete-orphan")


class PartManufacturer(Base):
    __tablename__ = "part_manufacturers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    manufacturer_id = Column(String, ForeignKey("manufacturers.id", ondelete="CASCADE"), nullable=False)
    manufacturer_part_number = Column(String, nullable=False, index=True)
    is_primary = Column(Boolean, default=True)

    part = relationship("Part", back_populates="manufacturers")
    manufacturer = relationship("Manufacturer", back_populates="parts")


class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False, index=True)
    code = Column(String)
    location = Column(String)
    contact_email = Column(String)
    contact_phone = Column(String)
    status = Column(String, default="Active") # E.g., Approved, Probation, Blocked
    is_authorized = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    parts = relationship("PartSupplier", back_populates="supplier", cascade="all, delete-orphan")


class PartSupplier(Base):
    __tablename__ = "part_suppliers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    supplier_part_number = Column(String, nullable=False, index=True)
    is_approved = Column(Boolean, default=True)

    part = relationship("Part", back_populates="suppliers")
    supplier = relationship("Supplier", back_populates="parts")


class LifecycleInfo(Base):
    __tablename__ = "lifecycle_info"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False, unique=True)

    # ── Core Lifecycle ───────────────────────────────────────
    lifecycle_status = Column(String, default="UNKNOWN")  # ACTIVE / NRND / EOL / OBSOLETE / DEPRECATED / UNKNOWN

    # ── EOL / LTB / Last-Ship Dates ──────────────────────────
    # These MUST come from an official source.  Never generated or estimated.
    eol_date = Column(Date, nullable=True)
    last_time_buy_date = Column(Date, nullable=True)
    last_ship_date = Column(Date, nullable=True)

    # ── Computed from eol_date ───────────────────────────────
    # NULL when eol_date is NULL.  Calculated in the service layer, never random.
    years_to_eol = Column(Float, nullable=True)

    # ── Provenance & Traceability ────────────────────────────
    provider = Column(String, nullable=True)           # e.g. "nexar", "siliconexpert", "seed/demo"
    source = Column(String, nullable=True)             # Human-readable source description
    source_url = Column(String, nullable=True)         # URL to provider part page / datasheet
    raw_status = Column(String, nullable=True)         # Exact string returned by the provider
    raw_response = Column(String, nullable=True)       # Full JSON payload (stored as Text for SQLite)

    # ── Verification & Match Quality ─────────────────────────
    verification_status = Column(String, default="UNVERIFIED")  # VERIFIED / UNVERIFIED / ESTIMATED / UNKNOWN
    match_type = Column(String, default="UNKNOWN")              # EXACT_MATCH / CLOSE_MATCH / NO_MATCH / UNKNOWN
    confidence_score = Column(Float, nullable=True)             # 0.0 – 1.0

    # ── Timestamps ───────────────────────────────────────────
    last_verified = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    part = relationship("Part", back_populates="lifecycle_info")


class ComplianceInfo(Base):
    __tablename__ = "compliance_info"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False, unique=True)
    rohs_status = Column(String, default="Unknown") # Compliant / Non-Compliant / Unknown
    rohs_directive_ref = Column(String)
    certificate_link = Column(String)
    notes = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    part = relationship("Part", back_populates="compliance_info")


class BOM(Base):
    __tablename__ = "boms"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    uploaded_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="Pending") # Pending, Processing, Completed, Failed
    total_items = Column(Integer, default=0)
    matched_items = Column(Integer, default=0)
    unmatched_items = Column(Integer, default=0)
    review_items = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    uploader = relationship("User", back_populates="boms")
    items = relationship("BOMItem", back_populates="bom", cascade="all, delete-orphan")


class BOMItem(Base):
    __tablename__ = "bom_items"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    bom_id = Column(String, ForeignKey("boms.id", ondelete="CASCADE"), nullable=False)
    serial_number = Column(Integer)
    original_part_number = Column(String, nullable=False)
    original_manufacturer = Column(String)
    original_supplier = Column(String)
    original_description = Column(String)
    quantity = Column(Float, default=1.0)
    
    validation_status = Column(String, default="Unmatched") # Matched / Suggested Match / Unmatched / Manual Review
    confidence_score = Column(Float, default=0.0) # 0-100%
    matched_part_id = Column(String, ForeignKey("parts.id", ondelete="SET NULL"), nullable=True)
    suggested_part_number = Column(String)
    suggested_supplier = Column(String)
    action_taken = Column(String) # Accept / Edit / Create Draft / Flag / Reject
    notes = Column(String)
    processed_at = Column(DateTime, default=datetime.utcnow)

    bom = relationship("BOM", back_populates="items")
    matched_part = relationship("Part")
    risk_assessment = relationship("RiskAssessment", back_populates="bom_item", uselist=False, cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String) # Datasheet, Compliance, PCN, etc.
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    url = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    part = relationship("Part", back_populates="documents")


class PCN(Base):
    __tablename__ = "pcns"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    pcn_number = Column(String, nullable=False, index=True)
    change_type = Column(String) # End of Life, Materials change, Manufacturing site, etc.
    description = Column(String)
    effective_date = Column(Date)
    status = Column(String, default="Active")
    document_link = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    part = relationship("Part", back_populates="pcns")


class ReplacementCandidate(Base):
    __tablename__ = "replacement_candidates"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    original_part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    replacement_part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String)
    confidence_score = Column(Float, default=0.0) # 0-100%
    replacement_notes = Column(String)
    action_taken = Column(String) # Accept / Reject / Manual Review / Suggested
    reviewed_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # --- AI Analysis Fields ---
    ai_score = Column(Float, nullable=True)
    ai_confidence = Column(String, nullable=True)        # high/medium/low
    ai_summary = Column(String, nullable=True)
    ai_reasoning = Column(String, nullable=True)
    ai_warnings = Column(JSON, nullable=True)            # list[str]
    ai_missing_data = Column(JSON, nullable=True)         # list[str]
    ai_validation_required = Column(JSON, nullable=True)  # list[str]
    ai_compatibility = Column(JSON, nullable=True)        # dict of details
    analysis_model = Column(String, nullable=True)        # e.g. gemini-2.0-flash
    analysis_timestamp = Column(DateTime, nullable=True)
    review_comments = Column(String, nullable=True)       # Engineer's comments
    review_timestamp = Column(DateTime, nullable=True)

    original_part = relationship("Part", foreign_keys=[original_part_id])
    replacement_part = relationship("Part", foreign_keys=[replacement_part_id])
    reviewer = relationship("User")


class PartNumberMapping(Base):
    """Maps an internal part number (IPN) to a true manufacturer part number (MPN)."""
    __tablename__ = "part_number_mappings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    internal_part_number = Column(String, nullable=False, index=True, unique=True)
    manufacturer_id = Column(String, ForeignKey("manufacturers.id", ondelete="SET NULL"), nullable=True)
    manufacturer_part_number = Column(String, nullable=True)
    
    mapping_source = Column(String) # e.g., "ERP_Export", "Manual_Entry"
    mapping_confidence = Column(Float, default=0.0)
    
    verification_status = Column(String, default="DRAFT") # VERIFIED, DRAFT, REJECTED, UNKNOWN
    verified_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    manufacturer = relationship("Manufacturer")
    verifier = relationship("User")


class PartNumberAlias(Base):
    """Explicitly verified aliases/variants for Part Numbers."""
    __tablename__ = "part_number_aliases"

    id = Column(String, primary_key=True, default=generate_uuid)
    requested_manufacturer = Column(String, nullable=False)
    requested_mpn = Column(String, nullable=False)
    returned_manufacturer = Column(String, nullable=False)
    returned_mpn = Column(String, nullable=False)
    
    variant_type = Column(String, nullable=False) # e.g. PACKAGING_VARIANT
    verification_status = Column(String, default="DRAFT", nullable=False) # DRAFT, VERIFIED, REJECTED
    evidence = Column(String, nullable=True)
    verified_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AliasReviewCandidate(Base):
    __tablename__ = "alias_review_candidates"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    requested_manufacturer = Column(String, nullable=False)
    requested_mpn = Column(String, nullable=False)
    
    returned_manufacturer = Column(String, nullable=False)
    returned_mpn = Column(String, nullable=False)
    
    proposed_variant_type = Column(String, nullable=True)
    provider = Column(String, nullable=False)
    evidence = Column(String, nullable=False)
    
    review_status = Column(String, default="PENDING") # PENDING, CONVERTED_TO_DRAFT, REJECTED
    reviewer = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=True)
    bom_item_id = Column(String, ForeignKey("bom_items.id", ondelete="CASCADE"), nullable=True, unique=True)
    
    overall_risk_score = Column(Float, default=0.0) # 0-100
    risk_level = Column(String, default="Low") # Low, Medium, High
    
    lifecycle_risk = Column(Float, default=0.0)
    eol_risk = Column(Float, default=0.0)
    supplier_risk = Column(Float, default=0.0)
    compliance_risk = Column(Float, default=0.0)
    counterfeit_risk = Column(Float, default=0.0)
    match_confidence_risk = Column(Float, default=0.0)
    
    notes = Column(String)
    assessed_at = Column(DateTime, default=datetime.utcnow)

    part = relationship("Part", back_populates="risk_assessments")
    bom_item = relationship("BOMItem", back_populates="risk_assessment")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=True) # Relaxed FK to preserve historical/service audit actors
    action = Column(String, nullable=False) # Create, Update, Delete, Upload, Download, Login
    entity_type = Column(String) # BOM, Part, User, etc.
    entity_id = Column(String)
    old_values = Column(JSON)
    new_values = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], primaryjoin="AuditLog.user_id==User.id", back_populates="audit_logs")


import enum
from sqlalchemy import Enum

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AlertType(str, enum.Enum):
    EOL_APPROACHING = "EOL_APPROACHING"
    EOL_REACHED = "EOL_REACHED"
    LIFECYCLE_CHANGED = "LIFECYCLE_CHANGED"
    PCN_RECEIVED = "PCN_RECEIVED"
    COMPLIANCE_ISSUE = "COMPLIANCE_ISSUE"
    SUPPLIER_RISK = "SUPPLIER_RISK"
    HIGH_RISK = "HIGH_RISK"
    REPLACEMENT_AVAILABLE = "REPLACEMENT_AVAILABLE"
    BOM_RISK_CHANGED = "BOM_RISK_CHANGED"

class AlertStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    
    # Optional associations
    part_id = Column(String, ForeignKey("parts.id", ondelete="CASCADE"), nullable=True)
    bom_id = Column(String, ForeignKey("boms.id", ondelete="CASCADE"), nullable=True)
    pcn_id = Column(String, ForeignKey("pcns.id", ondelete="CASCADE"), nullable=True)
    
    risk_score = Column(Float, nullable=True)
    
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE)
    is_read = Column(Boolean, default=False)
    
    dedup_key = Column(String, unique=True, nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    metadata_json = Column(JSON, nullable=True)
    
    part = relationship("Part")
    bom = relationship("BOM")
    pcn = relationship("PCN")
