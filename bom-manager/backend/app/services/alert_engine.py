import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.models import (
    Alert, AlertType, AlertSeverity, AlertStatus,
    Part, LifecycleInfo, PCN, ComplianceInfo, PartSupplier, RiskAssessment,
    ReplacementCandidate, BOMItem
)
from app.config import settings

from app.models.models import AuditLog

logger = logging.getLogger(__name__)

class AlertEngine:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.now = datetime.utcnow()
        self.today = self.now.date()
        self.alerts_created = 0
        self.alerts_updated = 0
        self.alerts_resolved = 0

    async def _upsert_alert(
        self,
        dedup_key: str,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        part_id: Optional[str] = None,
        bom_id: Optional[str] = None,
        pcn_id: Optional[str] = None,
        risk_score: Optional[float] = None,
        metadata_json: Optional[Dict] = None,
        auto_resolve: bool = False
    ):
        """Creates a new alert or updates an existing one based on dedup_key."""
        result = await self.session.execute(
            select(Alert).where(Alert.dedup_key == dedup_key)
        )
        existing = result.scalars().first()

        if auto_resolve:
            if existing and existing.status in [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]:
                existing.status = AlertStatus.RESOLVED
                existing.resolved_at = self.now
                self.alerts_resolved += 1
            return

        if existing:
            if existing.status == AlertStatus.RESOLVED:
                # Reactivate if it was resolved but issue is back
                existing.status = AlertStatus.ACTIVE
                existing.resolved_at = None
                existing.is_read = False
                existing.severity = severity
                existing.title = title
                existing.message = message
                existing.risk_score = risk_score
                existing.metadata_json = metadata_json
                self.alerts_updated += 1
            else:
                # Just update fields if it's already active/acknowledged
                if existing.severity != severity or existing.message != message:
                    existing.severity = severity
                    existing.title = title
                    existing.message = message
                    existing.risk_score = risk_score
                    existing.metadata_json = metadata_json
                    self.alerts_updated += 1
        else:
            new_alert = Alert(
                dedup_key=dedup_key,
                alert_type=alert_type,
                severity=severity,
                title=title,
                message=message,
                part_id=part_id,
                bom_id=bom_id,
                pcn_id=pcn_id,
                risk_score=risk_score,
                metadata_json=metadata_json
            )
            self.session.add(new_alert)
            self.alerts_created += 1

    async def evaluate_eol(self, parts: List[Part]):
        """Evaluates EOL dates for parts."""
        for part in parts:
            if not part.lifecycle_info or not part.lifecycle_info.eol_date:
                continue

            days_to_eol = (part.lifecycle_info.eol_date - self.today).days
            dedup_key = f"EOL_ALERT_{part.id}"

            if days_to_eol <= 0:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.EOL_REACHED,
                    severity=AlertSeverity.CRITICAL,
                    title="Component EOL Reached",
                    message=f"Part {part.part_number} reached its End-of-Life on {part.lifecycle_info.eol_date}.",
                    part_id=part.id,
                    metadata_json={"days_to_eol": days_to_eol, "eol_date": str(part.lifecycle_info.eol_date)}
                )
            elif days_to_eol <= settings.EOL_CRITICAL_DAYS:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.EOL_APPROACHING,
                    severity=AlertSeverity.CRITICAL,
                    title="Component Approaching EOL (CRITICAL)",
                    message=f"Part {part.part_number} will reach EOL in {days_to_eol} days.",
                    part_id=part.id,
                    metadata_json={"days_to_eol": days_to_eol}
                )
            elif days_to_eol <= settings.EOL_HIGH_DAYS:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.EOL_APPROACHING,
                    severity=AlertSeverity.HIGH,
                    title="Component Approaching EOL (HIGH)",
                    message=f"Part {part.part_number} will reach EOL in {days_to_eol} days.",
                    part_id=part.id,
                    metadata_json={"days_to_eol": days_to_eol}
                )
            elif days_to_eol <= settings.EOL_WARNING_DAYS:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.EOL_APPROACHING,
                    severity=AlertSeverity.WARNING,
                    title="Component Approaching EOL (WARNING)",
                    message=f"Part {part.part_number} will reach EOL in {days_to_eol} days.",
                    part_id=part.id,
                    metadata_json={"days_to_eol": days_to_eol}
                )
            else:
                # EOL is far enough away, auto-resolve if previously active
                await self._upsert_alert(dedup_key=dedup_key, alert_type=AlertType.EOL_APPROACHING, severity=AlertSeverity.INFO, title="", message="", auto_resolve=True)

    async def evaluate_lifecycle(self, parts: List[Part]):
        """Evaluates static lifecycle status (e.g. Obsolete, NRND) irrespective of dates."""
        for part in parts:
            if not part.lifecycle_info:
                continue
            status = part.lifecycle_info.lifecycle_status.lower()
            dedup_key = f"LIFECYCLE_ALERT_{part.id}"
            
            if status in ["obsolete", "discontinued"]:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.LIFECYCLE_CHANGED,
                    severity=AlertSeverity.CRITICAL,
                    title="Component is Obsolete",
                    message=f"Part {part.part_number} is currently marked as {status.upper()}.",
                    part_id=part.id
                )
            elif status == "nrnd":
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.LIFECYCLE_CHANGED,
                    severity=AlertSeverity.HIGH,
                    title="Component is NRND",
                    message=f"Part {part.part_number} is Not Recommended for New Designs (NRND).",
                    part_id=part.id
                )
            else:
                await self._upsert_alert(dedup_key=dedup_key, alert_type=AlertType.LIFECYCLE_CHANGED, severity=AlertSeverity.INFO, title="", message="", auto_resolve=True)

    async def evaluate_pcn(self):
        """Creates alerts for active PCNs."""
        result = await self.session.execute(select(PCN).where(PCN.status == "Active"))
        active_pcns = result.scalars().all()
        for pcn in active_pcns:
            dedup_key = f"PCN_ALERT_{pcn.id}"
            await self._upsert_alert(
                dedup_key=dedup_key,
                alert_type=AlertType.PCN_RECEIVED,
                severity=AlertSeverity.WARNING if "end of life" not in (pcn.change_type or "").lower() else AlertSeverity.CRITICAL,
                title=f"New PCN: {pcn.pcn_number}",
                message=f"A new Product Change Notice ({pcn.change_type}) has been issued for part {pcn.part_id}.",
                part_id=pcn.part_id,
                pcn_id=pcn.id,
                metadata_json={"change_type": pcn.change_type}
            )

    async def evaluate_compliance(self, parts: List[Part]):
        """Evaluates RoHS compliance issues."""
        for part in parts:
            if not part.compliance_info:
                continue
            status = (part.compliance_info.rohs_status or "").lower()
            dedup_key = f"COMPLIANCE_ALERT_{part.id}"
            
            if status == "non-compliant":
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.COMPLIANCE_ISSUE,
                    severity=AlertSeverity.HIGH,
                    title="Non-Compliant Component",
                    message=f"Part {part.part_number} is marked as RoHS Non-Compliant.",
                    part_id=part.id
                )
            elif status == "unknown":
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.COMPLIANCE_ISSUE,
                    severity=AlertSeverity.WARNING,
                    title="Unknown Compliance Status",
                    message=f"Part {part.part_number} has an unknown RoHS status.",
                    part_id=part.id
                )
            else:
                await self._upsert_alert(dedup_key=dedup_key, alert_type=AlertType.COMPLIANCE_ISSUE, severity=AlertSeverity.INFO, title="", message="", auto_resolve=True)

    async def evaluate_supplier_risk(self, parts: List[Part]):
        """Evaluates single-source or zero-approved supplier risks."""
        for part in parts:
            dedup_key = f"SUPPLIER_RISK_ALERT_{part.id}"
            approved_suppliers = [s for s in part.suppliers if s.is_approved]
            
            if len(approved_suppliers) == 0:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.SUPPLIER_RISK,
                    severity=AlertSeverity.HIGH,
                    title="Zero Approved Suppliers",
                    message=f"Part {part.part_number} has no approved suppliers available.",
                    part_id=part.id
                )
            elif len(approved_suppliers) == 1:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.SUPPLIER_RISK,
                    severity=AlertSeverity.WARNING,
                    title="Single-Source Risk",
                    message=f"Part {part.part_number} relies on a single approved supplier.",
                    part_id=part.id
                )
            else:
                await self._upsert_alert(dedup_key=dedup_key, alert_type=AlertType.SUPPLIER_RISK, severity=AlertSeverity.INFO, title="", message="", auto_resolve=True)

    async def evaluate_component_risk(self, parts: List[Part]):
        """Evaluates high overall risk scores."""
        for part in parts:
            if not part.risk_assessments:
                continue
            
            # Use the highest risk assessment if multiple exist for BOM items
            max_risk = max([ra.overall_risk_score for ra in part.risk_assessments if ra.overall_risk_score is not None], default=0.0)
            dedup_key = f"HIGH_RISK_ALERT_{part.id}"
            
            if max_risk >= settings.RISK_CRITICAL_THRESHOLD:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.HIGH_RISK,
                    severity=AlertSeverity.CRITICAL,
                    title="CRITICAL Risk Component",
                    message=f"Part {part.part_number} has a critical overall risk score of {max_risk}.",
                    part_id=part.id,
                    risk_score=max_risk
                )
            elif max_risk >= settings.RISK_HIGH_THRESHOLD:
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.HIGH_RISK,
                    severity=AlertSeverity.HIGH,
                    title="HIGH Risk Component",
                    message=f"Part {part.part_number} has a high overall risk score of {max_risk}.",
                    part_id=part.id,
                    risk_score=max_risk
                )
            else:
                await self._upsert_alert(dedup_key=dedup_key, alert_type=AlertType.HIGH_RISK, severity=AlertSeverity.INFO, title="", message="", auto_resolve=True)

    async def evaluate_replacements(self, parts: List[Part]):
        """Creates alerts for obsolete/high-risk parts that have AI replacements available."""
        for part in parts:
            # Check if this part has active high/critical alerts (EOL or Lifecycle or HighRisk)
            has_risk_alert = False
            res = await self.session.execute(
                select(Alert).where(
                    Alert.part_id == part.id,
                    Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]),
                    Alert.alert_type.in_([AlertType.EOL_REACHED, AlertType.LIFECYCLE_CHANGED, AlertType.HIGH_RISK]),
                    Alert.severity.in_([AlertSeverity.HIGH, AlertSeverity.CRITICAL])
                )
            )
            risk_alerts = res.scalars().all()
            if not risk_alerts:
                continue # No need to suggest replacements if part is perfectly healthy
            
            # Check if replacements exist
            res_repl = await self.session.execute(
                select(ReplacementCandidate).where(ReplacementCandidate.original_part_id == part.id)
            )
            replacements = res_repl.scalars().all()
            
            dedup_key = f"REPLACEMENT_ALERT_{part.id}"
            if len(replacements) > 0:
                best_ai_score = max([r.ai_score for r in replacements if r.ai_score is not None], default=0.0)
                await self._upsert_alert(
                    dedup_key=dedup_key,
                    alert_type=AlertType.REPLACEMENT_AVAILABLE,
                    severity=AlertSeverity.INFO,
                    title="Replacement Candidates Available",
                    message=f"Part {part.part_number} has {len(replacements)} potential replacement candidates available.",
                    part_id=part.id,
                    metadata_json={"candidates_count": len(replacements), "best_ai_score": best_ai_score}
                )
            else:
                await self._upsert_alert(dedup_key=dedup_key, alert_type=AlertType.REPLACEMENT_AVAILABLE, severity=AlertSeverity.INFO, title="", message="", auto_resolve=True)


    async def run_all_evaluations(self) -> Dict[str, int]:
        """Runs the entire alert engine pipeline."""
        logger.info("Starting Alert Engine Evaluation...")
        
        # Load all parts with relevant relationships for rule evaluation
        result = await self.session.execute(
            select(Part).options(
                selectinload(Part.lifecycle_info),
                selectinload(Part.compliance_info),
                selectinload(Part.suppliers),
                selectinload(Part.risk_assessments)
            )
        )
        parts = result.scalars().all()
        
        await self.evaluate_eol(parts)
        await self.evaluate_lifecycle(parts)
        await self.evaluate_compliance(parts)
        await self.evaluate_supplier_risk(parts)
        await self.evaluate_component_risk(parts)
        
        # Evaluate PCNs independently of parts list 
        await self.evaluate_pcn()
        
        # Must run after risk evaluations to know if replacements are needed
        await self.session.flush()
        await self.evaluate_replacements(parts)
        
        await self.session.commit()
        
        logger.info(f"Alert Engine Finished. Created: {self.alerts_created}, Updated: {self.alerts_updated}, Resolved: {self.alerts_resolved}")
        
        return {
            "alerts_created": self.alerts_created,
            "alerts_updated": self.alerts_updated,
            "alerts_resolved": self.alerts_resolved
        }
