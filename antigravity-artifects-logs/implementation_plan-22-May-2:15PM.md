# Implement Dynamic Pricing Calculation and Service Availability Checks

The current booking flow uses static provider prices. We need **dynamic pricing** that factors in service type, time slot demand, and provider experience level — while also adding real-time availability validation before showing providers to users.

> [!IMPORTANT]
> **User Review Required:** Dynamic pricing changes how costs are presented to users. The pricing formula (`base_rate * demand_multiplier * experience_factor`) must be reviewed to ensure fairness. Additionally, availability checks will add a DB query per provider — verify this doesn't degrade discovery latency.

## Proposed Steps

### 1. Add Dynamic Pricing Logic

Implement a pricing calculation that considers:
- **Base rate** from the provider's profile (`provider.hourly_rate`)
- **Demand multiplier** based on remaining slots for the requested date (fewer slots = higher demand)
- **Experience factor** derived from provider's years of experience and rating

Formula: `final_price = base_rate * (1 + demand_factor * 0.15) * (1 + experience_bonus * 0.1)`

Cap the maximum multiplier at **1.5x** base rate to prevent price gouging.

### 2. Real-Time Slot Availability Validation

Before returning providers in the discovery phase:
- Re-query `available_slots` at discovery time (not cached)
- Filter out providers with zero remaining slots for the requested date
- Sort by availability density (providers with more open slots ranked slightly higher)

### 3. Integrate into Smart Match Cards

Update the Smart Match Agent's fact sheet to include:
- Calculated price (not just base rate)
- Availability status ("3 slots remaining", "Last slot!")
- Comparative flags: `cheapest`, `most_available`, `top_rated`, `closest`

## Verification Plan

### Automated Tests
- Unit test pricing formula with edge cases (zero slots, max experience)
- Verify price cap never exceeds 1.5x base rate
- Test that fully-booked providers are excluded from results

### Manual Verification
- Book a provider and verify the displayed price matches the formula
- Confirm slot count decrements correctly after booking
- Verify Smart Match cards show accurate availability status
