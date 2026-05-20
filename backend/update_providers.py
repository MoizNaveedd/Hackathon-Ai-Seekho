"""
Update existing providers with Karachi locations, realistic coordinates, and better names.
Does NOT delete or re-create rows — just updates in place to preserve foreign keys.
"""
from database import SessionLocal
from models import Provider

# Karachi area coordinates (lat, lng) — real neighborhoods
KARACHI_AREAS = {
    "DHA Phase 6":        (24.7935, 67.0578),
    "Gulshan-e-Iqbal":    (24.9215, 67.0935),
    "Clifton":            (24.8138, 67.0300),
    "North Nazimabad":    (24.9420, 67.0345),
    "PECHS":              (24.8720, 67.0640),
    "Saddar":             (24.8607, 67.0099),
    "Korangi":            (24.8300, 67.1310),
    "Malir":              (24.8880, 67.2050),
    "Gulistan-e-Jauhar":  (24.9120, 67.1180),
    "FB Area":            (24.9500, 67.0520),
    "Bahria Town":        (24.9600, 67.2300),
    "Tariq Road":         (24.8690, 67.0550),
    "Nazimabad":          (24.9280, 67.0310),
    "Liaquatabad":        (24.9100, 67.0250),
    "Shah Faisal":        (24.8650, 67.1050),
}

# provider id -> (new_name, new_location_key) with slight coord jitter
UPDATES = [
    # AC Technicians
    (1,  "Shahzad AC & Cooling",         "DHA Phase 6",        0.003,  0.002),
    (2,  "Usman Refrigeration",          "Gulshan-e-Iqbal",    0.001, -0.001),
    (3,  "Faisal HVAC Experts",          "North Nazimabad",   -0.002,  0.003),

    # Plumbers
    (4,  "Bilal Plumbing Services",      "PECHS",              0.002,  0.001),
    (5,  "Tariq Pipe & Sanitary",        "Clifton",           -0.001,  0.002),
    (6,  "Nadeem Water Solutions",        "Korangi",            0.003, -0.002),

    # Electricians
    (7,  "Imran Electric Works",         "Saddar",             0.001,  0.003),
    (8,  "Zahid Power & Wiring",         "Gulistan-e-Jauhar", -0.002,  0.001),
    (9,  "Waqas Electrical Services",    "FB Area",            0.002, -0.001),

    # Beauticians
    (10, "Ayesha Beauty Studio",         "DHA Phase 6",       -0.001,  0.004),
    (11, "Hina Glamour Salon",           "Clifton",            0.002, -0.003),

    # Painters
    (12, "Rafiq Paint & Decor",          "Tariq Road",         0.001,  0.002),
    (13, "Shahbaz Color House",          "Malir",             -0.003,  0.001),

    # Carpenters
    (14, "Aslam Furniture & Woodwork",   "Nazimabad",          0.002, -0.002),
    (15, "Kamran Carpentry Works",       "Liaquatabad",       -0.001,  0.003),

    # Appliance Repair
    (16, "Sajid Electronics Repair",     "Gulshan-e-Iqbal",    0.003,  0.001),
    (17, "Omer TechFix Services",        "PECHS",             -0.002, -0.001),

    # Pest Control
    (18, "CleanHome Pest Solutions",     "North Nazimabad",    0.001,  0.002),
    (19, "SafeGuard Fumigation",         "Shah Faisal",       -0.001, -0.002),

    # Home Cleaning
    (20, "SparkleClean Karachi",         "Bahria Town",        0.002,  0.003),
    (21, "Deepak Cleaning Services",     "Gulistan-e-Jauhar", -0.003,  0.001),

    # Locksmith
    (22, "Irfan Master Key & Locks",     "Saddar",             0.003, -0.001),
    (23, "SafeLock Karachi",             "FB Area",           -0.002,  0.002),
]


def update_providers():
    db = SessionLocal()
    try:
        updated = 0
        for pid, new_name, area_key, lat_jitter, lng_jitter in UPDATES:
            provider = db.query(Provider).filter(Provider.id == pid).first()
            if not provider:
                print(f"  Provider id={pid} not found, skipping.")
                continue

            base_lat, base_lng = KARACHI_AREAS[area_key]
            provider.name = new_name
            provider.location = area_key
            provider.latitude = round(base_lat + lat_jitter, 6)
            provider.longitude = round(base_lng + lng_jitter, 6)
            updated += 1
            print(f"  [{pid}] {new_name} -> {area_key} ({provider.latitude}, {provider.longitude})")

        db.commit()
        print(f"\nDone. Updated {updated} providers.")
    finally:
        db.close()


if __name__ == "__main__":
    update_providers()
