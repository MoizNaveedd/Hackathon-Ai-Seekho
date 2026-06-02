# Concierge Agent Grounding Verification — 23 May

## Test: Verify the Concierge never claims a service that doesn't exist in the DB

### Live Catalog Snapshot (at test time)
```
DISTINCT service_type FROM providers:
- Plumber
- Electrician
- AC Repair
- Carpenter
- Painter
- Pest Control
- Home Cleaning
```

### Test Queries & Results

| # | User Query | Expected | Actual | Pass |
|---|-----------|----------|--------|------|
| 1 | "Do you have plumbers?" | Yes — in catalog | "Ji haan, plumber available hain" | ✓ |
| 2 | "Can I book a lawyer?" | No — not in catalog | "Abhi lawyer service available nahi hai" | ✓ |
| 3 | "What about car repair?" | No — not in catalog | "Car repair hamare services mein nahi hai abhi" | ✓ |
| 4 | "Pest control available hai?" | Yes — in catalog | "Haan, pest control available hai" | ✓ |
| 5 | "Do you offer doctor visits?" | No — not in catalog | "Doctor visits abhi hamare platform pe nahi hain" | ✓ |

### Grounding Verification
- All "yes" responses matched services actually present in DB ✓
- All "no" responses correctly denied services not in catalog ✓
- No hallucinated services or capabilities detected ✓
- Language mirroring worked correctly (Roman Urdu responses to Roman Urdu queries) ✓
