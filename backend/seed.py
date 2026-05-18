from database import engine, Base, SessionLocal
from models import Provider, User

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Check if we already have providers
    if db.query(Provider).first():
        print("Database already seeded.")
        return

    print("Seeding users...")
    mock_users = [
        User(name="Ahmed Khan", location="G-13", latitude=33.6331, longitude=72.9691),
        User(name="Sara Ali", location="F-8", latitude=33.7087, longitude=73.0397),
        User(name="Hamza Tariq", location="I-8", latitude=33.6900, longitude=73.0700),
    ]
    db.add_all(mock_users)

    print("Seeding providers...")
    mock_providers = [
        # AC Technicians
        Provider(name="Ali AC Services", service_type="AC Technician", location="G-13", rating=4.8, available_slots='["09:00 AM", "10:00 AM", "01:00 PM"]', latitude=33.6350, longitude=72.9700),
        Provider(name="Usman Cooling Experts", service_type="AC Technician", location="G-11", rating=4.5, available_slots='["04:00 PM", "06:00 PM"]', latitude=33.6620, longitude=72.9880),
        Provider(name="Faisal HVAC Solutions", service_type="AC Technician", location="F-8", rating=4.3, available_slots='["09:00 AM", "11:00 AM", "03:00 PM"]', latitude=33.7095, longitude=73.0410),

        # Plumbers
        Provider(name="Bilal Plumbers", service_type="Plumber", location="G-11", rating=4.2, available_slots='["10:00 AM", "06:00 PM"]', latitude=33.6650, longitude=72.9900),
        Provider(name="Tariq Water Works", service_type="Plumber", location="G-13", rating=4.6, available_slots='["09:00 AM", "11:00 AM", "02:00 PM", "05:00 PM"]', latitude=33.6320, longitude=72.9710),
        Provider(name="Nadeem Pipe Masters", service_type="Plumber", location="I-8", rating=4.0, available_slots='["10:00 AM", "01:00 PM", "04:00 PM"]', latitude=33.6880, longitude=73.0680),

        # Electricians
        Provider(name="Imran Electrician", service_type="Electrician", location="G-13", rating=4.0, available_slots='["09:00 AM", "10:00 AM", "01:00 PM", "04:00 PM", "06:00 PM"]', latitude=33.6340, longitude=72.9650),
        Provider(name="Zahid Electric Co.", service_type="Electrician", location="F-7", rating=4.7, available_slots='["10:00 AM", "12:00 PM", "03:00 PM"]', latitude=33.7210, longitude=73.0520),
        Provider(name="Waqas Power Solutions", service_type="Electrician", location="I-10", rating=4.4, available_slots='["09:00 AM", "11:00 AM", "02:00 PM", "06:00 PM"]', latitude=33.6510, longitude=73.0880),

        # Beauticians
        Provider(name="Ayesha Beauticians", service_type="Beautician", location="F-8", rating=4.9, available_slots='["01:00 PM", "04:00 PM"]', latitude=33.7100, longitude=73.0400),
        Provider(name="Glamour Studio by Hina", service_type="Beautician", location="G-13", rating=4.6, available_slots='["10:00 AM", "12:00 PM", "03:00 PM", "05:00 PM"]', latitude=33.6360, longitude=72.9720),

        # Painters
        Provider(name="Rafiq Paint Masters", service_type="Painter", location="G-10", rating=4.3, available_slots='["09:00 AM", "11:00 AM", "02:00 PM"]', latitude=33.6790, longitude=73.0040),
        Provider(name="Shahbaz Color Works", service_type="Painter", location="I-8", rating=4.1, available_slots='["10:00 AM", "01:00 PM", "04:00 PM"]', latitude=33.6920, longitude=73.0720),

        # Carpenters
        Provider(name="Aslam Woodcraft", service_type="Carpenter", location="G-12", rating=4.5, available_slots='["09:00 AM", "12:00 PM", "03:00 PM"]', latitude=33.6460, longitude=72.9760),
        Provider(name="Furniture Fix by Kamran", service_type="Carpenter", location="F-6", rating=4.2, available_slots='["10:00 AM", "02:00 PM", "05:00 PM"]', latitude=33.7310, longitude=73.0620),

        # Appliance Repair
        Provider(name="Sajid Home Appliances", service_type="Appliance Repair", location="G-13", rating=4.4, available_slots='["09:00 AM", "11:00 AM", "01:00 PM", "04:00 PM"]', latitude=33.6330, longitude=72.9680),
        Provider(name="TechFix by Omer", service_type="Appliance Repair", location="F-8", rating=4.7, available_slots='["10:00 AM", "03:00 PM", "06:00 PM"]', latitude=33.7080, longitude=73.0380),

        # Pest Control
        Provider(name="CleanHome Pest Control", service_type="Pest Control", location="G-11", rating=4.6, available_slots='["09:00 AM", "12:00 PM", "04:00 PM"]', latitude=33.6640, longitude=72.9910),
        Provider(name="SafeGuard Fumigation", service_type="Pest Control", location="I-10", rating=4.3, available_slots='["10:00 AM", "01:00 PM", "05:00 PM"]', latitude=33.6530, longitude=73.0900),

        # Home Cleaning
        Provider(name="SparkleClean Services", service_type="Home Cleaning", location="F-8", rating=4.8, available_slots='["08:00 AM", "10:00 AM", "01:00 PM", "04:00 PM"]', latitude=33.7070, longitude=73.0390),
        Provider(name="Deepak Cleaning Crew", service_type="Home Cleaning", location="G-13", rating=4.2, available_slots='["09:00 AM", "12:00 PM", "03:00 PM"]', latitude=33.6355, longitude=72.9695),

        # Locksmith
        Provider(name="Master Key by Irfan", service_type="Locksmith", location="G-10", rating=4.5, available_slots='["09:00 AM", "11:00 AM", "02:00 PM", "05:00 PM", "07:00 PM"]', latitude=33.6810, longitude=73.0060),
        Provider(name="SafeLock Solutions", service_type="Locksmith", location="F-7", rating=4.1, available_slots='["10:00 AM", "01:00 PM", "04:00 PM"]', latitude=33.7190, longitude=73.0490),
    ]

    db.add_all(mock_providers)
    db.commit()
    print(f"Seeding complete. {len(mock_providers)} providers added.")

if __name__ == "__main__":
    seed_db()
