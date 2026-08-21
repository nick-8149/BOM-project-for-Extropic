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
    audit_logs = relationship("AuditLog", back_populates="user")


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
    lifecycle_status = Column(String, default="Active") # Active / NRND / Obsolete / Deprecated / Unknown
    eol_date = Column(Date, nullable=True)
    years_to_eol = Column(Float, nullable=True)
    last_verified = Column(Date, default=datetime.utcnow().date)
    source = Column(String)
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
    action_taken = Column(String) # Accept / Reject / Manual Review
    reviewed_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    original_part = relationship("Part", foreign_keys=[original_part_id])
    replacement_part = relationship("Part", foreign_keys=[replacement_part_id])
    reviewer = relationship("User")


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
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False) # Create, Update, Delete, Upload, Download, Login
    entity_type = Column(String) # BOM, Part, User, etc.
    entity_id = Column(String)
    old_values = Column(JSON)
    new_values = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
