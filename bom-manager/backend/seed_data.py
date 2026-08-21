import asyncio
import datetime
import random
from sqlalchemy.future import select
from app.database import async_session_maker
from app.models.models import Part, Manufacturer, Supplier, PartManufacturer, PartSupplier, LifecycleInfo, ComplianceInfo

# Lists of sample data to generate realistic MIL/Aerospace/Industrial parts
MANUFACTURERS = [
    {"name": "Texas Instruments", "code": "TI", "country_of_origin": "USA", "website": "https://www.ti.com"},
    {"name": "Analog Devices", "code": "ADI", "country_of_origin": "USA", "website": "https://www.analog.com"},
    {"name": "Infineon Technologies", "code": "IFX", "country_of_origin": "Germany", "website": "https://www.infineon.com"},
    {"name": "STMicroelectronics", "code": "ST", "country_of_origin": "Switzerland", "website": "https://www.st.com"},
    {"name": "Microchip Technology", "code": "MCHP", "country_of_origin": "USA", "website": "https://www.microchip.com"},
    {"name": "TE Connectivity", "code": "TE", "country_of_origin": "Switzerland", "website": "https://www.te.com"},
    {"name": "Molex", "code": "MOL", "country_of_origin": "USA", "website": "https://www.molex.com"},
    {"name": "Vishay Intertechnology", "code": "VSH", "country_of_origin": "USA", "website": "https://www.vishay.com"},
]

SUPPLIERS = [
    {"name": "Mouser Electronics", "code": "MOU", "location": "USA", "contact_email": "sales@mouser.com", "contact_phone": "+1-800-346-6873", "status": "Active", "is_authorized": True},
    {"name": "DigiKey", "code": "DKY", "location": "USA", "contact_email": "sales@digikey.com", "contact_phone": "+1-800-344-4539", "status": "Active", "is_authorized": True},
    {"name": "Arrow Electronics", "code": "ARR", "location": "USA", "contact_email": "sales@arrow.com", "contact_phone": "+1-855-326-4757", "status": "Active", "is_authorized": True},
    {"name": "Avnet", "code": "AVN", "location": "USA", "contact_email": "sales@avnet.com", "contact_phone": "+1-800-874-8111", "status": "Active", "is_authorized": True},
    {"name": "Farnell (Element14)", "code": "FAR", "location": "UK", "contact_email": "sales@farnell.com", "status": "Active", "is_authorized": True},
    {"name": "BrokerSource Components", "code": "BSC", "location": "China", "status": "Blocked", "is_authorized": False}, # Unauthorized/Suspicious supplier for risk testing
]

PART_TEMPLATES = [
    {"category": "IC - Microcontroller", "prefix": "MSP430FR", "package": "LQFP-64", "std": "Industrial"},
    {"category": "IC - Operational Amplifier", "prefix": "OP177", "package": "SOIC-8", "std": "MIL-STD-883"},
    {"category": "IC - Operational Amplifier", "prefix": "LM124J", "package": "CDIP-14", "std": "MIL-PRF-38535"},
    {"category": "IC - Transceiver", "prefix": "MAX3232", "package": "TSSOP-16", "std": "Industrial"},
    {"category": "IC - Voltage Regulator", "prefix": "LM7805", "package": "TO-220", "std": "Industrial"},
    {"category": "IC - Memory", "prefix": "24LC256", "package": "SOIC-8", "std": "Industrial"},
    {"category": "Connector", "prefix": "D38999", "package": "Circular Flange", "std": "MIL-DTL-38999"},
    {"category": "Resistor", "prefix": "CRCW0603", "package": "0603", "std": "Industrial"},
    {"category": "Capacitor", "prefix": "T491", "package": "3528-21", "std": "Industrial"},
    {"category": "IC - Gate Driver", "prefix": "IR2101", "package": "PDIP-8", "std": "Industrial"},
]

LIFECYCLE_STATUSES = ["Active", "NRND", "Obsolete", "Deprecated"]
ROHS_STATUSES = ["Compliant", "Non-Compliant", "Unknown"]

async def seed_data():
    print("Seeding database with sample parts, manufacturers, and suppliers...")
    async with async_session_maker() as session:
        # 1. Seed Manufacturers
        mfr_instances = []
        for m in MANUFACTURERS:
            # Check if exists
            res = await session.execute(select(Manufacturer).where(Manufacturer.name == m["name"]))
            existing = res.scalars().first()
            if not existing:
                mfr = Manufacturer(**m)
                session.add(mfr)
                mfr_instances.append(mfr)
            else:
                mfr_instances.append(existing)

        # 2. Seed Suppliers
        supplier_instances = []
        for s in SUPPLIERS:
            res = await session.execute(select(Supplier).where(Supplier.name == s["name"]))
            existing = res.scalars().first()
            if not existing:
                sup = Supplier(**s)
                session.add(sup)
                supplier_instances.append(sup)
            else:
                supplier_instances.append(existing)

        await session.commit()

        # 3. Create ~60 Synthetic Parts
        random.seed(42)  # Deterministic seeding
        for i in range(1, 61):
            tmpl = random.choice(PART_TEMPLATES)
            mfr = random.choice(mfr_instances)
            
            # Generate valid MPN (e.g. MSP430FR5969IRGZT-MIL)
            suffix = f"-{random.randint(100, 9999)}"
            if tmpl["std"].startswith("MIL"):
                suffix += "-MIL"
            part_number = f"{tmpl['prefix']}{suffix}"
            
            # Check if exists
            res = await session.execute(select(Part).where(Part.part_number == part_number))
            if res.scalars().first():
                continue
                
            desc = f"{tmpl['category']} - High Reliability standard {tmpl['std']} grade component."
            
            part = Part(
                part_number=part_number,
                description=desc,
                category=tmpl["category"],
                package_type=tmpl["package"],
                standard_cert=tmpl["std"],
                notes=f"Sample part {i} generated for testing matching algorithms."
            )
            session.add(part)
            await session.flush() # Populate part.id

            # Add PartManufacturer relationship (some parts have multiple manufacturers)
            pm = PartManufacturer(
                part_id=part.id,
                manufacturer_id=mfr.id,
                manufacturer_part_number=part_number,
                is_primary=True
            )
            session.add(pm)

            # 20% chance of an alternate manufacturer
            if random.random() < 0.2:
                alt_mfr = random.choice([m for m in mfr_instances if m.id != mfr.id])
                pm_alt = PartManufacturer(
                    part_id=part.id,
                    manufacturer_id=alt_mfr.id,
                    manufacturer_part_number=f"{part_number}-ALT",
                    is_primary=False
                )
                session.add(pm_alt)

            # Add PartSupplier relationships
            sup = random.choice(supplier_instances)
            ps = PartSupplier(
                part_id=part.id,
                supplier_id=sup.id,
                supplier_part_number=f"{part_number}-SP",
                is_approved=sup.is_authorized
            )
            session.add(ps)

            # Seed Lifecycle Statuses
            status = random.choice(LIFECYCLE_STATUSES)
            eol_date = None
            years_to_eol = None
            if status in ["Obsolete", "NRND", "Deprecated"]:
                # EOL is past or near
                days_offset = random.randint(-365*2, 365*5)
                eol_date = datetime.date.today() + datetime.timedelta(days=days_offset)
                years_to_eol = round((eol_date - datetime.date.today()).days / 365.25, 2)
            else:
                # Active
                if random.random() < 0.5:
                    eol_date = datetime.date.today() + datetime.timedelta(days=random.randint(365*6, 365*15))
                    years_to_eol = round((eol_date - datetime.date.today()).days / 365.25, 2)

            li = LifecycleInfo(
                part_id=part.id,
                lifecycle_status=status,
                eol_date=eol_date,
                years_to_eol=years_to_eol,
                source="Manufacturer Portal Direct Sync",
                last_verified=datetime.date.today()
            )
            session.add(li)

            # Seed RoHS statuses
            rohs = random.choice(ROHS_STATUSES)
            ci = ComplianceInfo(
                part_id=part.id,
                rohs_status=rohs,
                rohs_directive_ref="EU 2011/65/EU" if rohs == "Compliant" else None,
                certificate_link=f"https://www.docserver.com/certs/{part_number}.pdf" if rohs == "Compliant" else None,
                notes="Verified RoHS status."
            )
            session.add(ci)

        await session.commit()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
