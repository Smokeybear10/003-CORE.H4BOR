# HarborOS Risk Algorithm — Technical Deep Dive

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Stage 1: Anomaly Detection](#stage-1-anomaly-detection)
   - [Geofence Breach](#1-geofence-breach)
   - [Loitering](#2-loitering)
   - [Speed Anomaly](#3-speed-anomaly)
   - [Heading Anomaly](#4-heading-anomaly)
   - [AIS Gap](#5-ais-gap)
   - [Dark Vessel](#6-dark-vessel)
   - [Zone Lingering](#7-zone-lingering)
   - [Kinematic Implausibility](#8-kinematic-implausibility)
   - [Statistical Outlier](#9-statistical-outlier)
   - [Collision Risk](#10-collision-risk)
4. [Stage 2: Risk Scoring](#stage-2-risk-scoring)
   - [Anomaly Score](#a-anomaly-score-max-85-points)
   - [Metadata Quality Penalty](#b-metadata-quality-penalty-max-15-points)
   - [Inspection History Penalty](#c-inspection-history-penalty-max-12-points)
   - [Total Score Computation](#d-total-score-computation)
5. [Stage 3: Action Recommendation](#stage-3-action-recommendation)
6. [Stage 4: Explanation Generation](#stage-4-explanation-generation)
7. [Alert Generation Pipeline](#alert-generation-pipeline)
8. [Frontend Visualization](#frontend-visualization)
9. [Worked Examples](#worked-examples)
10. [Randomness & Honesty Disclosure](#randomness--honesty-disclosure)
11. [Limitations & Caveats](#limitations--caveats)
12. [Source File Reference](#source-file-reference)

---

## Overview

HarborOS computes a **0-100 risk score** for each vessel by combining three components:

| Component | Max Points | Source |
|-----------|-----------|--------|
| Anomaly signals | 85 | Heuristic detectors run against position history |
| Metadata quality | 15 | Missing vessel identification fields |
| Inspection history | 12 | Port state control deficiencies |

The theoretical maximum is 112 points, hard-capped at 100.

**The risk scoring pipeline is fully deterministic.** Given the same vessel data and position history, it will always produce the same score. There is no randomness, no machine learning inference, and no external API calls in the scoring path.

---

## Architecture & Data Flow

```
                         ┌──────────────────────────────┐
                         │   Position Reports (DB)       │
                         │   Geofences (DB)              │
                         │   Regional Stats (computed)    │
                         │   Nearby Vessels (computed)    │
                         └──────────┬───────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   ANOMALY DETECTION ENGINE     │
                    │   (anomaly_detection.py)       │
                    │                               │
                    │   10 independent detectors     │
                    │   each returns 0+ signals      │
                    │   with type + severity (0-1)   │
                    └──────────┬────────────────────┘
                               │
                      list[AnomalySignalSchema]
                               │
                               ▼
                    ┌───────────────────────────────┐
                    │   RISK SCORING ENGINE          │
                    │   (risk_scoring.py)            │
                    │                               │
                    │   1. Score anomaly signals     │
                    │   2. Score metadata quality    │
                    │   3. Score inspection history  │
                    │   4. Sum + cap at 100          │
                    │   5. Map to action             │
                    │   6. Generate explanation      │
                    └──────────┬────────────────────┘
                               │
                      RiskAssessmentSchema
                               │
                               ▼
                    ┌───────────────────────────────┐
                    │   ALERT SERVICE                │
                    │   (alert_service.py)           │
                    │                               │
                    │   Create/update AlertORM       │
                    │   if risk_score >= 10          │
                    └───────────────────────────────┘
```

---

## Stage 1: Anomaly Detection

**Source:** `backend/app/services/anomaly_detection.py`

Each detector is a standalone function that receives vessel data and returns a list of `AnomalySignalSchema` objects. Each signal has:
- **`anomaly_type`** — one of 11 enum values
- **`severity`** — float between 0.0 and 1.0
- **`description`** — human-readable text
- **`details`** — optional dict with specifics

Detectors are run via `run_anomaly_detection()`, which calls all detectors and collects their signals. Exceptions in any single detector are silently caught so one broken detector doesn't block the others.

---

### 1. Geofence Breach

**Triggers when:** A vessel's position falls inside a restricted, security, or environmental geofence zone.

**How it works:**
- Iterates all geofences filtered to `restricted`, `security`, or `environmental` zone types
- Parses the geofence's GeoJSON polygon geometry
- Tests the vessel's **last 10 positions** using a ray-casting point-in-polygon algorithm
- Produces one signal per breached geofence (stops after first matching position per geofence)

**Severity:**
| Condition | Severity |
|-----------|----------|
| Geofence severity = `"high"` | **0.9** |
| All other zone types | **0.6** |

**Note:** Severity is binary (0.6 or 0.9) based solely on the geofence's `severity` field. There is no gradation based on how deep into the zone the vessel is or how long it has been there (zone lingering handles duration separately).

---

### 2. Loitering

**Triggers when:** A vessel is nearly stationary in a small area for an extended time.

**How it works:**
- Examines the last 20 position reports
- Counts positions with speed < 1.0 knots ("slow" positions)
- Requires at least 3 slow positions
- Computes the bounding box spread using Haversine distance
- Requires spread < 0.5 nautical miles
- Requires time span > 8 minutes

**Severity formula:**
```
severity = min(0.9, 0.3 + (time_span_minutes / 120))
```

| Duration | Severity |
|----------|----------|
| 8 min (minimum) | 0.37 |
| 30 min | 0.55 |
| 60 min | 0.80 |
| 72+ min | 0.90 (cap) |

---

### 3. Speed Anomaly

**Triggers when:** A vessel has rapid, erratic speed changes.

**How it works:**
- Extracts all speed values from positions with non-null speed
- Counts consecutive speed deltas > 3 knots
- Requires at least 2 large changes to trigger

**Severity formula:**
```
severity = min(0.8, 0.3 + (large_changes * 0.1))
```

| Large Changes | Severity |
|---------------|----------|
| 2 (minimum) | 0.50 |
| 3 | 0.60 |
| 5+ | 0.80 (cap) |

---

### 4. Heading Anomaly

**Triggers when:** A vessel makes frequent, sharp course changes.

**How it works:**
- Extracts course-over-ground values from positions
- Computes delta between consecutive headings (handles 360/0 wraparound)
- Counts turns > 30 degrees
- Requires at least 3 large turns and 5+ position reports

**Severity formula:**
```
severity = min(0.7, 0.2 + (large_turns * 0.1))
```

| Large Turns | Severity |
|-------------|----------|
| 3 (minimum) | 0.50 |
| 5 | 0.70 (cap) |

---

### 5. AIS Gap

**Triggers when:** There are gaps in AIS transmission within the vessel's track history.

**How it works:**
- Computes time delta between every pair of consecutive positions
- Any gap > 10 minutes is flagged
- Uses the **maximum gap** for severity calculation

**Severity formula:**
```
severity = min(0.85, 0.4 + (max_gap_minutes / 60) * 0.3)
```

| Max Gap | Severity |
|---------|----------|
| 10 min (minimum) | 0.45 |
| 30 min | 0.55 |
| 60 min | 0.70 |
| 90+ min | 0.85 (cap) |

---

### 6. Dark Vessel

**Triggers when:** A vessel has stopped transmitting AIS entirely (stale last report).

**How it works:**
- Compares the most recent position timestamp against `datetime.utcnow()`
- Requires 15+ minutes since last report
- Validates the vessel was transmitting regularly before going dark (at least 3 consecutive intervals under 5 minutes)
- Computes average transmission interval from the regular intervals

**Severity (tier-based):**
| Minutes Since Last Report | Severity |
|--------------------------|----------|
| 15-29 min | **0.4** |
| 30-59 min | **0.6** |
| 60+ min | **0.85** |

**Note:** This detector uses the `AIS_GAP` anomaly type (same as detector #5), meaning the risk scorer will group them together and take the maximum severity between the two. They won't double-count.

---

### 7. Zone Lingering

**Triggers when:** A vessel spends extended time inside a security or restricted zone.

**How it works:**
- Filters geofences to `security` and `restricted` types only
- For each geofence, counts which of the vessel's positions fall inside the polygon
- Computes time span between first and last in-zone positions
- Requires 3+ positions in-zone and 20+ minutes duration

**Severity formula:**
```
severity = min(0.8, 0.4 + (time_in_zone_minutes / 90))
```

| Duration in Zone | Severity |
|-----------------|----------|
| 20 min (minimum) | 0.62 |
| 45 min | 0.90 → capped at **0.80** |

---

### 8. Kinematic Implausibility

**Triggers when:** A vessel's reported positions imply physically impossible movement.

**How it works:**
- For each pair of consecutive positions, computes:
  - Distance via Haversine formula
  - Time delta in hours
  - Implied speed = distance / time
- Flags if implied speed > 50 knots (the maximum plausible for any vessel type)
- Also flags if the reported speed-over-ground > 50 knots
- Counts total "impossible jumps"

**Severity formula:**
```
severity = min(0.9, 0.5 + (impossible_jumps * 0.15))
```

| Impossible Jumps | Severity |
|-----------------|----------|
| 1 (minimum) | 0.65 |
| 2 | 0.80 |
| 3+ | 0.90 (cap) |

**What this catches:** AIS spoofing, data corruption, or GPS jamming — cases where the vessel's reported position/speed is physically impossible.

---

### 9. Statistical Outlier

**Triggers when:** A vessel's behavior statistically deviates from regional norms.

**Requires:** Pre-computed regional statistics (computed from the 5000 most recent position reports across all vessels). Will not fire if there are fewer than 10 positions regionally.

**How it works:**
1. Computes the vessel's mean speed and speed variance
2. Computes a Z-score: how far the vessel's speed standard deviation is from the regional mean
3. Computes heading change variance and compares to regional heading variance
4. Combines into a deviation score:
   ```
   deviation = (speed_z * 0.6) + (max(0, heading_ratio - 1.5) * 0.4)
   ```
5. Only triggers if `deviation >= 1.0`

**Severity formula:**
```
severity = min(0.85, 0.3 + (deviation * 0.2))
```

**Guard rails:**
- `regional_speed_std` is floored at 0.5 to avoid division by near-zero
- Heading ratio baseline is 1.5 (vessel must be 50% more variable than the regional norm before heading contributes)

---

### 10. Collision Risk

**Triggers when:** Two moving vessels are on a converging course with a dangerously small closest point of approach (CPA).

**Requires:** Pre-computed list of all vessels' latest positions (id, lat, lon, speed, course, name).

**How it works:**
1. Only considers the vessel's latest position
2. Both vessels must be moving > 2.0 knots (anchored/moored vessels near each other are normal)
3. Only checks vessels within 0.5 nautical miles
4. Computes CPA using relative velocity:
   - Converts course/speed to velocity vectors
   - Computes relative position and velocity
   - Calculates time to CPA (TCPA) and distance at CPA
5. Only triggers if CPA < 0.1nm (~185 meters) and TCPA < 15 minutes (0.25 hours)
6. Caps at 2 collision risk signals per vessel

**Severity formula:**
```
severity = min(0.95, 0.6 + (0.1 - cpa_distance) * 4)
```

| CPA Distance | Severity |
|-------------|----------|
| 0.1nm (threshold) | 0.60 |
| 0.05nm (~93m) | 0.80 |
| 0.01nm (~19m) | 0.95 (near cap) |

---

## Stage 2: Risk Scoring

**Source:** `backend/app/services/risk_scoring.py`

The risk score is a weighted sum of three independent components.

### A. Anomaly Score (max 85 points)

Each anomaly type has a fixed weight reflecting its operational significance:

| Anomaly Type | Weight | Rationale |
|-------------|--------|-----------|
| Collision Risk | **28** | Immediate safety threat |
| Geofence Breach | **25** | Direct security zone violation |
| Kinematic Implausibility | **22** | Strong spoofing/data integrity indicator |
| AIS Gap | **20** | Possible intentional concealment |
| Loitering | **20** | Suspicious behavioral pattern |
| Speed Anomaly | **18** | Erratic behavior indicator |
| Zone Lingering | **18** | Prolonged presence in sensitive area |
| Heading Anomaly | **15** | Erratic navigation |
| Route Deviation | **15** | Off-course behavior |
| Statistical Outlier | **14** | Contextual — less definitive alone |
| Type Mismatch | **12** | Behavioral inconsistency with vessel type |

**Per-type scoring logic:**

```python
# For each anomaly type that has signals:
contribution = weight * max_severity * sensitivity_factor

# Diminishing bonus for multiple signals of the same type:
# +2 per extra signal, maximum +4 (i.e., max 2 extra signals count)
if extra_count > 0:
    contribution += min(extra_count, 2) * 2
```

**Design decision:** Only the **highest severity** signal of each type is used for the primary contribution. This prevents "5 collision risks = auto-escalate" in dense waterways where multiple vessels are nearby.

**Diversity multiplier (applied after summing all types):**

| Distinct Signal Types | Multiplier |
|----------------------|------------|
| 3 or more | **1.15** (15% boost) |
| 2 | **1.05** (5% boost) |
| 1 or 0 | **1.00** (no boost) |

**Hard cap:** The anomaly score is capped at **85 points** regardless of how many signals fire. This ensures metadata and inspection history always have room to contribute.

**Sensitivity factor:** A global multiplier (default `1.0`) referenced as "Wang 2020 rare behaviour factor." Values > 1.0 make detection more aggressive; values < 1.0 make it less aggressive. Currently hardcoded — not exposed to operators via UI.

---

### B. Metadata Quality Penalty (max 15 points)

Checks 5 vessel identification fields:
1. `name`
2. `imo` (International Maritime Organization number)
3. `callsign`
4. `destination`
5. `flag_state`

A field is counted as "missing" if it is:
- `None` / null
- Empty string or whitespace-only
- Literally `"UNKNOWN"` (case-insensitive)

**Formula:**
```
metadata_score = (missing_count / 5) * 15
```

| Missing Fields | Score |
|---------------|-------|
| 0 | 0.0 |
| 1 | 3.0 |
| 2 | 6.0 |
| 3 | 9.0 |
| 4 | 12.0 |
| 5 | 15.0 |

---

### C. Inspection History Penalty (max 12 points)

Uses the `inspection_deficiencies` integer field on the vessel record (from port state control data).

**Formula:**
```
inspection_score = min(12, deficiencies * 3)
```

| Deficiencies | Score |
|-------------|-------|
| 0 | 0 |
| 1 | 3 |
| 2 | 6 |
| 3 | 9 |
| 4+ | 12 (cap) |

---

### D. Total Score Computation

```python
total_score = min(100, anomaly_score + metadata_score + inspection_score)
```

That's it. A straight sum, capped at 100. No normalization, no weighting between the three components beyond the caps.

---

## Stage 3: Action Recommendation

**Source:** `risk_scoring.py:determine_action()`

The score maps directly to one of four action levels:

| Score Range | Action | Meaning |
|------------|--------|---------|
| **65 - 100** | `ESCALATE` | Immediate operator action required |
| **35 - 64** | `VERIFY` | Requires investigation/verification |
| **15 - 34** | `MONITOR` | Track closely, no immediate action |
| **0 - 14** | `IGNORE` | Routine traffic, no concern |

These thresholds are hardcoded constants. They are not tunable without code changes.

---

## Stage 4: Explanation Generation

**Source:** `risk_scoring.py:generate_explanation()`

Produces a human-readable string combining:
1. Anomaly signal descriptions, sorted by severity (highest first)
2. Metadata issues (if any fields missing)
3. Inspection deficiencies (if any)
4. Falls back to "No significant anomalies detected" if nothing triggered

This explanation is stored on the alert and displayed in the UI.

---

## Alert Generation Pipeline

**Source:** `backend/app/services/alert_service.py`

The `generate_alerts_for_all_vessels()` function orchestrates the full pipeline:

1. **Pre-computation:**
   - Loads all vessels and geofences from the database
   - Computes regional statistics from the 5000 most recent position reports (for statistical outlier detection)
   - Builds a lookup of every vessel's latest position (for collision risk detection)

2. **Per-vessel processing:**
   - Loads all position reports for the vessel, ordered by timestamp
   - Runs all anomaly detectors → collects signals
   - Passes signals to `compute_risk_assessment()` → gets score, action, explanation

3. **Alert creation/update:**
   - **If `risk_score < 10`:** No alert created (vessel is routine traffic)
   - **If an active alert already exists for this vessel:** Updates it with the new score, action, explanation, and signals
   - **If no active alert exists:** Creates a new `AlertORM` record
   - Replaces all `AnomalySignalORM` records for the alert (delete old, insert new)

4. Commits all changes to the database

---

## Frontend Visualization

### Color Coding

Both `AlertFeed.tsx` and `VesselDetail.tsx` use the same `riskColor()` function:

| Score | Color | CSS Class |
|-------|-------|-----------|
| >= 70 | Red | `text-red-400` |
| >= 45 | Orange | `text-orange-400` |
| >= 25 | Yellow | `text-yellow-400` |
| < 25 | Green | `text-green-400` |

**Note:** These frontend thresholds (70/45/25) do **not** match the backend action thresholds (65/35/15). A vessel with score 40 would be `VERIFY` on the backend but shown as yellow (not orange) on the frontend.

### Map Visualization (`MapView.tsx`)

- Vessel dot **color** is determined by `vesselColor()` based on risk score
- Vessel dot **size** scales: 14px (default), 18px (score >= 45), 22px (selected)
- **Glow effect** via CSS `drop-shadow`: intensity increases at score 45 and 70
- Alerts sort by risk score descending by default

---

## Worked Examples

### Example 1: High-Risk Vessel

**Vessel:** Missing IMO, callsign, and destination. 4 inspection deficiencies.

**Signals detected:**
- Geofence breach (severity 0.9) — entered restricted high-severity zone
- Loitering (severity 0.7) — stationary for 48 minutes
- Speed anomaly (severity 0.8) — 5 rapid speed changes
- AIS gap (severity 0.6) — 30-minute transmission gap

**Anomaly score calculation:**
```
Geofence:  25 * 0.9 * 1.0 = 22.5
Loitering: 20 * 0.7 * 1.0 = 14.0
Speed:     18 * 0.8 * 1.0 = 14.4
AIS gap:   20 * 0.6 * 1.0 = 12.0
                             ────
Subtotal:                    62.9

Diversity (4 types >= 3): 62.9 * 1.15 = 72.3
Cap at 85:                               72.3
```

**Metadata score:** 3 missing fields → (3/5) * 15 = **9.0**

**Inspection score:** 4 deficiencies → min(12, 4*3) = **12.0**

**Total:** min(100, 72.3 + 9.0 + 12.0) = **93.3**

**Action:** ESCALATE (>= 65)

---

### Example 2: Low-Risk Vessel

**Vessel:** All metadata complete. 0 inspection deficiencies.

**Signals detected:** None.

**Anomaly score:** 0.0
**Metadata score:** 0.0
**Inspection score:** 0.0

**Total:** **0.0**

**Action:** IGNORE (< 15)

---

### Example 3: Medium-Risk Vessel

**Vessel:** All metadata complete. 2 inspection deficiencies.

**Signals detected:**
- Speed anomaly (severity 0.7)
- Loitering (severity 0.6)

**Anomaly score:**
```
Speed:     18 * 0.7 = 12.6
Loitering: 20 * 0.6 = 12.0
                       ────
Subtotal:              24.6
Diversity (2 types):   24.6 * 1.05 = 25.8
```

**Metadata score:** 0.0
**Inspection score:** min(12, 2*3) = **6.0**

**Total:** min(100, 25.8 + 0 + 6.0) = **31.8**

**Action:** MONITOR (>= 15, < 35)

---

## Randomness & Honesty Disclosure

### Risk scoring: NO randomness

The `risk_scoring.py` and `anomaly_detection.py` files contain **zero** calls to `random`. Given identical input data, the algorithm always produces the same score.

### Where randomness IS used

**1. Seed data generation (`backend/app/seed.py`):**
The demo/seed data generator uses `random` extensively to create synthetic vessel position histories:
- `random.uniform()` for position jitter, speed noise, heading noise
- `random.choice()` for erratic speed patterns in anomalous vessels
- This affects **what data exists to score**, but the scoring itself is deterministic

**2. Verification request simulation (`backend/app/api/routes.py`):**
When an operator requests SAR/satellite verification of a vessel, the response uses `random` to simulate:
- `random.randint(1, 3)` — days since last satellite pass
- `random.uniform(0.70, 0.88)` — SAR confidence score
- `random.randint(5, 35)` — cloud cover percentage
- `random.randint(1, 4)` — wake detection count
- `random.uniform(0.80, 0.93)` — satellite confidence score

**This is mock data.** In a production system, these values would come from actual satellite imagery APIs. The randomness here simulates the kind of data an operator would receive — it does not influence the risk score.

---

## Limitations & Caveats

1. **Hand-tuned weights.** The signal weights (28, 25, 22, etc.) and action thresholds (65, 35, 15) are manually chosen heuristics. The code references "Wang 2020" and "Stach et al. 2023" as academic sources, but the specific numbers are not derived from empirical training data or statistical optimization.

2. **No feedback loop.** Operators can mark alerts as "confirmed" or "false_positive", and the system tracks precision metrics, but this feedback does **not** feed back into the scoring weights. The weights are static.

3. **Silent exception swallowing.** Each anomaly detector is wrapped in a try/except that silently continues on any error. A broken detector produces zero signals instead of raising an alarm — this means bugs could silently reduce detection coverage.

4. **Regional stats are a snapshot.** The statistical outlier detector computes regional norms from the most recent 5000 position reports. In a busy harbor, this could represent a very short time window. In a quiet area, it could span days. The window is not time-bounded.

5. **Collision risk uses latest position only.** The CPA/TCPA calculation is based on each vessel's single most recent position. It assumes constant course and speed — it does not extrapolate from track history or account for maneuvering.

6. **Frontend/backend threshold mismatch.** The backend maps scores to actions at 15/35/65, while the frontend color-codes at 25/45/70. This means a vessel at score 36 is "VERIFY" in the backend but shown as yellow (not orange) in the UI.

7. **`TYPE_MISMATCH` and `ROUTE_DEVIATION` are weighted but not implemented.** These anomaly types have weights in `SIGNAL_WEIGHTS` (12 and 15 respectively) but no corresponding detector function in `anomaly_detection.py`. They will never fire.

8. **Dark vessel reuses `AIS_GAP` type.** The `detect_dark_vessel` function emits signals with `anomaly_type=AIS_GAP`, the same type as `detect_ais_gap`. In the risk scorer, these are grouped together and only the max severity counts. While this prevents double-counting, it also means the scorer cannot distinguish "gap in history" from "currently dark" — both are treated identically.

9. **Sensitivity factor is not operator-accessible.** The `SENSITIVITY_FACTOR` is documented as "operator-tunable" but is a hardcoded constant (1.0) with no API endpoint or UI to change it.

---

## Source File Reference

| File | Purpose |
|------|---------|
| `backend/app/services/risk_scoring.py` | Core scoring engine: weights, score computation, action mapping, explanation |
| `backend/app/services/anomaly_detection.py` | 10 heuristic detectors + detection engine orchestrator |
| `backend/app/services/alert_service.py` | Alert generation pipeline: runs detection + scoring for all vessels |
| `backend/app/models/domain.py` | Data models: `AnomalyType` enum, `RiskAssessmentSchema`, ORM models |
| `backend/app/api/routes.py` | REST endpoints including `/vessels/{id}/risk` (also contains mock verification data with randomness) |
| `backend/app/seed.py` | Demo data generator (uses randomness for synthetic positions) |
| `backend/tests/test_risk_scoring.py` | Unit tests verifying thresholds and scoring behavior |
| `frontend/app/components/AlertFeed.tsx` | Alert list with risk color coding and sorting |
| `frontend/app/components/VesselDetail.tsx` | Vessel detail panel with risk score display |
| `frontend/app/components/MapView.tsx` | Map visualization with risk-based vessel coloring and sizing |
