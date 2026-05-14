# HarborOS — Complete Interview Brief

*A long-form, interview-ready walkthrough of everything HarborOS is, how it works, why each piece exists, and the thinking behind every non-obvious choice.*

---

## Table of Contents

1. [What HarborOS Is, in One Paragraph](#1-what-harboros-is-in-one-paragraph)
2. [The Problem](#2-the-problem)
3. [The Insight (Why This Project Exists)](#3-the-insight-why-this-project-exists)
4. [The End-to-End Loop: Detect → Assess → Recommend → Verify](#4-the-end-to-end-loop-detect--assess--recommend--verify)
5. [Architecture at a Glance](#5-architecture-at-a-glance)
6. [The Tech Stack and Why Each Piece Was Chosen](#6-the-tech-stack-and-why-each-piece-was-chosen)
7. [External APIs: Where They Came From and How They're Wired Up](#7-external-apis-where-they-came-from-and-how-theyre-wired-up)
8. [Backend Deep Dive](#8-backend-deep-dive)
9. [Anomaly Detection — All 12 Detectors, With the Research Behind Them](#9-anomaly-detection--all-12-detectors-with-the-research-behind-them)
10. [Vessel Type Profiles — The Anti-False-Positive Layer](#10-vessel-type-profiles--the-anti-false-positive-layer)
11. [Signal Aggregation and Defense-Relevance Weighting](#11-signal-aggregation-and-defense-relevance-weighting)
12. [Fuzzy Risk Inference Engine](#12-fuzzy-risk-inference-engine)
13. [MARSEC Action Mapping](#13-marsec-action-mapping)
14. [Learned Baselines and Pattern Learning](#14-learned-baselines-and-pattern-learning)
15. [Ingestion, Archive, and Data Retention](#15-ingestion-archive-and-data-retention)
16. [Frontend Deep Dive](#16-frontend-deep-dive)
17. [SeaPod: The Physical Edge Node Story](#17-seapod-the-physical-edge-node-story)
18. [Demo Scenarios and Seeded Vessels](#18-demo-scenarios-and-seeded-vessels)
19. [Design Decisions and Tradeoffs](#19-design-decisions-and-tradeoffs)
20. [Known Limitations and What I'd Do Next](#20-known-limitations-and-what-id-do-next)
21. [Likely Interview Questions and Strong Answers](#21-likely-interview-questions-and-strong-answers)

---

## 1. What HarborOS Is, in One Paragraph

HarborOS is a maritime awareness and operator decision-support platform for contested littoral defense. It ingests live vessel traffic from AISStream.io, runs a dozen independent anomaly detectors over every vessel's recent position history, weights the signals by how relevant they are to maritime defense, combines them through a Mamdani fuzzy logic engine with metadata and inspection context, maps the resulting 0–100 score to an ISPS-aligned action (ignore, monitor, verify, escalate), and presents the whole picture to an operator through a dark-themed MapLibre dashboard with an alert feed, vessel detail panel, risk sparklines, Copernicus Sentinel-2 satellite verification, and a plug-in path for physical edge nodes like the SeaPod Raspberry Pi buoy. Every alert is explainable — the operator sees which signals fired, why, and what the recommended next step is — and the whole thing runs locally against a SQLite database with a FastAPI backend on port 8000 and a Next.js 16 / React 19 frontend on port 3000.

## 2. The Problem

Harbors and littoral zones are the soft belly of modern maritime defense. They are contested, dense, and targeted by exactly the cheap threats that expensive exquisite sensor networks were not built to catch: smuggling skiffs, reconnaissance vessels with false AIS profiles, "dark" ships that have intentionally disabled their transponders, dual-use commercial hulls used for sanctions evasion, and non-cooperative contacts that simply do not broadcast AIS at all.

Legacy maritime monitoring is bad at this for three reasons. First, it's expensive and siloed — each sensor feed is a separate system. Second, it gives operators raw data with no triage; a person is expected to mentally assemble a risk picture from scattered widgets. Third, the action loop is manual and slow — there is no clean path from "I see something suspicious" to "I dispatch a verification asset to look at it."

The scale of the missing picture is real. Academic research on 28 billion AIS signals from 2017–2019 identified more than 55,000 deliberate AIS-disabling events, accounting for roughly 6% of global fishing activity and about 1.6 million hours per year of untracked vessel movement worldwide. Illegal fishing alone costs the global economy an estimated $10–25 billion annually. Russia's post-2022 "shadow fleet" showed roughly twice the AIS gap frequency of pre-invasion traffic. This is not a theoretical problem.

The operator problem is just as real. During a busy hour at a major port, a human analyst may be looking at several hundred contacts at once. Without triage, the analyst is the bottleneck, and the most dangerous contact is whichever one has the worst luck of being in the operator's peripheral vision at the wrong moment. That is not a defense posture — that is hope.

## 3. The Insight (Why This Project Exists)

You don't need a billion-dollar sensor network to defend a harbor. You need three things:

1. **Persistent awareness** — continuous coverage of every cooperative contact in the operating area, plus a pipeline ready to ingest non-cooperative detections from cheap local sensors.
2. **Smart, explainable triage** — a scoring engine that does not hand operators a black-box number, but instead tells them which signals fired, why each signal matters, and what the recommended action is.
3. **A fast verification loop** — a first-class concept in the software for dispatching a real-world asset (satellite tasking, drone, patrol boat, dockside camera) to confirm or reject a suspicious contact before it becomes an incident.

The thesis behind HarborOS is that cheap sensing plus software triage plus a rapid verification loop beats exquisite stovepiped systems that are too expensive to deploy at scale. If the software layer is good enough, you can bolt progressively better sensing onto the same pipeline over time — start with free AIS, add free Sentinel-2 satellite imagery, then add $50-bill-of-materials edge nodes like SeaPod — without rewriting the decision layer every time.

That is what HarborOS is trying to be. Not a "dashboard," not an "AI product." The operating system for harbor defense: the layer between raw sensors and human decisions.

## 4. The End-to-End Loop: Detect → Assess → Recommend → Verify

Every feature in HarborOS is in service of a four-step loop that the operator runs dozens of times a day:

1. **Detect.** The system ingests live AIS positions from AISStream.io (or seeded demo data), runs twelve independent anomaly detectors over each vessel's recent position history, and attaches zero or more typed signals to each vessel — loitering, AIS gap, geofence breach, kinematic implausibility, and so on.

2. **Assess.** The signals are weighted by defense relevance, combined with metadata deficiency (missing IMO, missing flag, missing callsign, etc.) and inspection history (Port State Control deficiencies), and pushed through a Mamdani fuzzy logic engine that produces a single 0–100 composite risk score.

3. **Recommend.** The score is mapped to one of four ISPS-aligned actions: NORMAL (below 35), MONITOR (35–59), VERIFY (60–79), or ESCALATE (80+). These aren't decorative labels — the alert generator actively suppresses scores that drop below 35, and collision-risk-only alerts are auto-suppressed unless something else is also firing, so the bands function as operational filters.

4. **Verify.** For any alert, the operator can dispatch a verification request. In the current build, this creates a satellite verification task against the Copernicus Data Space Sentinel-2 catalog, attaches scene metadata (acquisition time, cloud cover, processing level), and returns a rendered true-color image tile that can be overlaid on the map. The integration surface is designed to accept other asset types — drone, patrol boat, dockside camera — as first-class citizens, not bolted on later.

The whole point of the loop is that the operator is never asked to do raw math. They are asked to make the human calls — is this real, is this worth escalating, is this a false positive — and the software does the scoring and triage work that precedes those calls.

## 5. Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│                       Operator Dashboard                       │
│       Next.js 16 · React 19 · TypeScript · Tailwind v4         │
│                      MapLibre GL (open tiles)                  │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  Map     │  │  Alert    │  │  Vessel    │  │  Analytics    │ │
│  │  View    │  │  Feed     │  │  Detail    │  │  / Risk Dist  │ │
│  └──────────┘  └──────────┘  └────────────┘  └──────────────┘ │
└──────────────────────────────┬───────────────────────────────┘
                               │  REST (JSON) polling every 5s
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                         FastAPI Backend                         │
│                     Python 3.11 · SQLAlchemy                     │
│                                                                 │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │  Ingestion  │  │   Anomaly     │  │      Fuzzy Risk      │  │
│  │  WebSocket  │→ │  Detection    │→ │    Scoring Engine    │  │
│  │  Batcher    │  │  (12 detect.) │  │  (Mamdani · 16 rules)│  │
│  └─────────────┘  └───────┬───────┘  └──────────┬───────────┘  │
│                            │                    │               │
│                            ↓                    ↓               │
│                 ┌──────────────────────────────────────┐       │
│                 │  Vessel Profiles   ·  Learned Baselines│       │
│                 │  (per-type thresh.)   (Parquet archive)│       │
│                 └──────────────────────────────────────┘       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  SQLite (vessels, positions, alerts, geofences, audits)  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────┐  ┌───────────┐  ┌──────────┐  ┌────────────┐  │
│  │ AISStream  │  │ Copernicus│  │   NWS    │  │  Esri Tiles │  │
│  │  (AIS WS)  │  │ (Sentinel)│  │ (weather)│  │  (fallback) │  │
│  └────────────┘  └───────────┘  └──────────┘  └────────────┘  │
└────────────────────────────────────────────────────────────────┘
                               │
                               │  POST /api/edge-node/alert
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                    SeaPod Edge Node (Raspberry Pi 5)            │
│          Stereo Pi Camera · NEO-6M GPS · LSM6DSO IMU            │
│              YOLO object detection · MJPEG stream                │
└────────────────────────────────────────────────────────────────┘
```

The architecture is deliberately boring in the boring places and interesting where it matters. Plain REST with 5-second polling is fine for an MVP and keeps the frontend simple. The interesting bits are in the detector stack, the fuzzy scoring engine, and the way external APIs are plugged in as degradable enrichment layers rather than hard dependencies.

## 6. The Tech Stack and Why Each Piece Was Chosen

| Layer | Technology | Why this, not something else |
|---|---|---|
| Backend language | Python 3.11+ | Fast to write, strong typing via Pydantic, great async support, the entire maritime/ML research ecosystem speaks Python. |
| Web framework | FastAPI | Automatic OpenAPI schema, native async, first-class Pydantic, production-ready without ceremony. |
| ORM | SQLAlchemy (Declarative) | Mature, swappable backend, plays well with FastAPI dependency injection. |
| Database | SQLite | Zero-config, ships as one file, enough for an MVP with thousands of vessels. The schema maps cleanly to Postgres if I ever need to scale out — I am writing portable SQL and not relying on SQLite-specific quirks. |
| Batch format | Parquet (via pyarrow) | Columnar, compressed, fast to scan for learned-baseline aggregation, standard in the data-engineering world. |
| AIS protocol client | `websockets` library | Pure-Python, asyncio-native, no extra runtime. |
| Frontend framework | Next.js 16 (App Router) | Modern React, SSR-ready if I need it, great dev loop. |
| UI library | React 19 | Latest concurrent features, works cleanly with Next's App Router. |
| Styling | Tailwind CSS v4 | Fastest way to write an operator-console dark UI without hand-rolling a design system. |
| Map engine | MapLibre GL JS | Open source, no API key, vector tiles, and I can stack a raster satellite layer on top. Mapbox clone without the billing surprises. |
| Tile source | OpenStreetMap / Carto / Esri / Copernicus | Stacked fallback — Carto dark for operator mode, Esri as satellite fallback, Copernicus Sentinel-2 when configured. |

The theme across those choices is *degradable dependencies*. Every external input can be missing and the product still works — just with less enrichment. No key for AISStream? Fall back to seeded demo data. No Copernicus credentials? Fall back to Esri imagery. NWS weather fails? Return `None` and the detectors quietly widen their thresholds. That is not laziness, it is deliberate: a demo that needs eight working API keys to start up is a demo that will not start up.

## 7. External APIs: Where They Came From and How They're Wired Up

This is the section interviewers will ask about the most. Every one of these was chosen because it is free (or has a generous free tier), well-documented, and operationally realistic for maritime defense use.

### 7.1 AISStream.io — The Primary AIS Feed

- **Endpoint:** `wss://stream.aisstream.io/v0/stream`
- **Documentation:** `https://aisstream.io/documentation`
- **Auth:** API key passed in the first WebSocket message as part of a JSON subscription frame
- **Cost:** Free tier is generous enough for MVP traffic
- **Why this and not something else:** Commercial AIS providers (ExactEarth, Spire, ORBCOMM) charge thousands to tens of thousands of dollars per month. MarineTraffic's API is usable but the free tier does not include streaming position reports. AISStream.io is the only public WebSocket-based AIS feed I found that gives real-time messages without paying for a trial; it exists specifically because the creators wanted an open alternative for researchers and hobbyists.
- **How HarborOS uses it:** The adapter opens a WebSocket, sends a subscription envelope containing the API key and a list of bounding boxes (one per region — LA Harbor, Black Sea, Strait of Hormuz, South China Sea, Taiwan Strait, Strait of Malacca, English Channel, Eastern Med, Sea of Azov, plus a SeaPod demo region over Philadelphia), and then consumes incoming messages. Each message is either a `PositionReport` (SOG, COG, heading, lat, lon, timestamp) or a `ShipStaticData` (name, type, flag, dimensions, IMO, callsign, destination). The adapter parses both, filters sentinel values (SOG 1023 = not available, heading 511 = not available, lat 91 / lon 181 = not available), normalizes vessel type codes (AIS type 30–36 = fishing, 70–80 = cargo, 80–90 = tanker, and so on per ITU-R M.1371), and pushes records onto the ingestion queue.
- **Resilience:** Auto-reconnect with exponential backoff capped at 30 seconds. If the server drops the connection, the consumer loop reconnects, re-sends the subscription envelope, and keeps going. Connection stats (messages received, position reports, static data, errors, connected-since) are exposed through `/api/ingestion/status` so operators can see the feed health.
- **Regional subscription trick:** Instead of subscribing to the entire world and filtering client-side, HarborOS sends a narrow bounding box per region. This keeps message volume manageable on the free tier and makes regional analytics easy — every message already knows which region it came from.

### 7.2 Copernicus Data Space Ecosystem (CDSE) — Sentinel-2 Satellite Imagery

- **Registration:** `https://dataspace.copernicus.eu`
- **Token endpoint:** `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`
- **Catalog search:** `https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search`
- **Process API (imagery rendering):** `https://sh.dataspace.copernicus.eu/api/v1/process`
- **Auth:** OAuth2 client credentials flow (`CDSE_CLIENT_ID` + `CDSE_CLIENT_SECRET`). Tokens are cached in-process with a 60-second buffer before expiry so repeated calls do not thrash the auth endpoint.
- **Cost:** Free. CDSE is the European Union's successor to the old Copernicus Open Access Hub, with a more modern Sentinel Hub–style API on top of the free data.
- **Why this and not something else:** The commercial satellite imagery market is expensive. Planet Labs, Maxar, Airbus — all of them charge for imagery and imaging tasking. Sentinel-2 is publicly funded by the EU, has 10-meter resolution (good enough to distinguish vessels from their wake in most conditions), revisits every 5 days (sometimes less with Sentinel-2A and 2B combined), has 290 km swath width, carries 13 spectral bands, and the archive is *free*. CDSE is the canonical modern way to access it; the old Copernicus Open Access Hub is being decommissioned.
- **Why not the old COAH?** COAH (`scihub.copernicus.eu`) was being wound down when I was building this, and the new CDSE has a much nicer Sentinel Hub–style API with OAuth2, catalog search, and a "process" endpoint that will render a true-color image on demand instead of making you download a 1 GB .SAFE package and run sen2cor yourself.
- **Evalscript:** The "process" endpoint takes a JavaScript fragment called an evalscript that describes how to render the raw sensor data. HarborOS ships a simple true-color evalscript that takes B04 (red), B03 (green), and B02 (blue), multiplies by 3.5 / 10000 for visible contrast, and clamps to [0, 1]. That produces a reasonable natural-color image of vessels against water.
- **Catalog search windowing:** Real Sentinel-2 acquisitions are sparse in time (5-day revisit with occasional cloud cover), so the catalog search uses a progressive window-widening strategy. The code tries `(spread_deg=0.05, days_back=30, max_cloud_cover=50)` first; if nothing comes back, it widens to `(0.08, 45, 70)`; then `(0.12, 60, 90)`. This is the difference between "empty search results" and "usable verification loop" in practice.
- **Graceful fallback:** If CDSE credentials aren't configured at all, the satellite verification path falls back to Esri World Imagery, which is a static raster tile service with no authentication. The UI labels the state so operators know they are looking at a fallback and not a live Sentinel catalog result.
- **Resolution, revisit, swath:** These are surfaced through `/api/satellite/info` so the dashboard can show users what capabilities are available — 10 m resolution, 5-day revisit, 290 km swath, 13 bands, sun-synchronous orbit at 786 km altitude.

### 7.3 NWS (National Weather Service) — Free Weather API

- **Endpoint:** `https://api.weather.gov/points/{lat},{lon}` → `/forecast/hourly`
- **Auth:** *None.* No API key. The service just requires a descriptive `User-Agent` header. HarborOS sends `User-Agent: HarborOS/1.0 (maritime-awareness)`.
- **Cost:** Free. It's a US government service.
- **Coverage:** US only (including territorial waters and some coastal adjacencies).
- **Why this:** I needed a weather source to make detectors weather-aware (loitering should not fire in fog, speed thresholds should widen in high wind), and I did not want to pay for OpenWeatherMap or introduce another API key dependency. `api.weather.gov` is free, respectful of rate limits, documented, and delivers both wind speed and visibility — the two fields detectors actually use.
- **How it's used:** The adapter caches results by 0.5° grid cell with a 15-minute TTL, so a dense cluster of vessels in the same bay all share one cached fetch instead of hammering the API. The two-step flow — first `/points` to get the forecast grid cell for the lat/lon, then `/forecast/hourly` on that grid cell — is exactly what NWS documents.
- **Parsing:** Wind speed is returned as a string like `"15 to 20 mph"`; HarborOS parses the high end of the range and converts to knots. Visibility is not returned as a number, so the adapter extracts it from the short forecast text — keywords `fog`, `mist`, `haze`, `rain`, `clear`, and so on map to visibility bands in nautical miles.
- **Graceful miss:** Any request that fails, or any position outside the US, returns `None`, and all weather-aware detectors are written to treat `None` as "weather unknown — use default thresholds."

### 7.4 Esri World Imagery — No-Auth Satellite Fallback

- **Endpoint:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- **Auth:** None.
- **Why this:** Esri publishes World Imagery as an open raster tile service with no API key. It is not the same thing as a live Sentinel feed — it is a mosaic of the best available high-resolution imagery globally — but it is perfect as a fallback basemap when Copernicus is unavailable. It also looks good in the satellite view.

### 7.5 Carto Basemaps — Dark and Labeled Tiles

- **Endpoint:** Carto's public basemap tile service (dark matter and positron variants)
- **Auth:** None for the public basemaps.
- **Why this:** The operator console is dark-themed. The default OpenStreetMap raster tiles look wrong in a dark UI. Carto's dark-matter style was built for exactly this kind of operations console and was the cleanest-looking free dark basemap I could find.

### 7.6 The Adapter Pattern

All external adapters implement a simple pattern: a `load()` or equivalent method that returns normalized records, plus an `is_available()` or credentials check. If the real source is unavailable, the adapter returns an empty list (for AIS) or `None` (for enrichment) — it never raises an exception up into the detector layer. This is the reason the demo works without any API keys at all: everything degrades cleanly.

## 8. Backend Deep Dive

### 8.1 Layout

```
backend/app/
  main.py                       # FastAPI entry point, lifespan, CORS
  database.py                   # SQLAlchemy engine + SessionLocal + init_db
  seed.py                       # Loads the LA Harbor demo scenario
  models/
    domain.py                   # ORM models + Pydantic schemas
  api/
    routes.py                   # All REST endpoints
  services/
    anomaly_detection.py        # 12 detectors, weather-aware, type-aware
    risk_scoring.py             # Signal aggregation + metadata + inspection
    fuzzy_risk.py               # Mamdani engine + 16 rules + defuzzification
    vessel_profiles.py          # Per-type thresholds and severity multipliers
    pattern_learning.py         # LearnedBaseline from Parquet or SQLite
    alert_service.py            # Alert generation, auto-resolution, pruning
    ingestion_service.py        # AIS WebSocket batcher + background alert loop
    archive_service.py          # Parquet rolling archive
  data_sources/
    aisstream_adapter.py        # AIS WebSocket client
    sentinel_adapter.py         # Copernicus OAuth2 + catalog + process API
    nws_adapter.py              # api.weather.gov with grid-cell caching
```

Everything lives in one Python package so a single `uvicorn app.main:app` starts the whole backend, and the modules are cleanly separated by responsibility so nothing crosses a boundary it should not.

### 8.2 Domain Models

The key ORM models are:

- **VesselORM** — every vessel seen through any feed, with MMSI, name, type, flag state, region, IMO, callsign, destination, dimensions, and a risk cache (last computed score and recommended action).
- **PositionReportORM** — a single AIS position report (timestamp, lat, lon, SOG, COG, heading). Indexed by vessel_id and timestamp so detector queries are fast.
- **GeofenceORM** — a named polygon with a zone type (restricted, security, environmental, shipping lane, anchorage) and a severity label. Geometries are stored as GeoJSON strings and parsed into Python dicts when needed.
- **AlertORM** — the operator-facing alert record: risk score, recommended action, status (active, acknowledged, dismissed, resolved), explanation text, and a one-to-many link to `AnomalySignalORM` children.
- **AnomalySignalORM** — a single anomaly signal attached to an alert: type, severity, human-readable description, and a JSON blob of details.
- **AlertAuditORM** — every operator action on an alert (acknowledge, dismiss, escalate, add notes). Gives the system a full audit trail.
- **RiskHistoryORM** — timestamped risk scores so the frontend can draw a sparkline of how a vessel's risk trended over the last few hours.
- **VerificationRequestORM** — verification tasks with an extensive set of satellite-metadata columns (bbox, request time, asset type, catalog status, acquisition time, cloud cover, processing level, scene ID, render URL, result notes, result confidence).

All Pydantic schemas live in the same file as the ORM models. That is deliberate: it keeps the mapping between "what the database stores" and "what the API returns" visible in one place, and it prevents the kind of drift where an ORM field exists but nobody remembered to add it to the API response.

### 8.3 Lifespan and Auto-Ingestion

`main.py` uses FastAPI's lifespan context manager pattern. On startup, it initializes the database schema, then checks for `AISSTREAM_API_KEY` in the environment. If present, it kicks off the background AIS ingestion task. If not, it quietly skips — the seeded demo scenario still works fine without a live feed.

This is the pattern that makes the demo robust. A new user cloning the repo and running it end-to-end does not have to sign up for anything; they run `python -m app.seed`, `uvicorn app.main:app`, and `npm run dev`, and they see a working dashboard with the seeded LA Harbor scenario immediately.

### 8.4 Routes

`routes.py` exposes everything the frontend needs:

- `/regions` — named bounding boxes with center coordinates and descriptions
- `/vessels` — paginated list with optional region filter
- `/vessels/{id}` — full detail with positions, signals, explanation, weather, inspection
- `/vessels/{id}/risk-history` — time series for the sparkline
- `/vessels/{id}/report` — exportable report payload
- `/vessels/positions/at-time` — scenario replay cursor
- `/alerts`, `/alerts/{id}`, `/alerts/{id}/audit`, `/alerts/{id}/action` — alert feed, detail, audit trail, operator action
- `/detection/metrics` — precision, pending feedback, confirmed threats, false positives
- `/analytics/distribution` — risk histogram and tier breakdown
- `/geofences` — restricted, security, environmental zones
- `/verification-requests` — create and fetch satellite tasks
- `/satellite/info`, `/satellite/search`, `/satellite/by-vessel/{id}`, `/satellite/imagery` — CDSE catalog and rendered imagery
- `/scenario/timeline` — scenario replay bounds
- `/ingestion/status`, `/ingestion/start`, `/ingestion/stop` — live feed control
- `/archive/*` — Parquet rolling archive stats
- `/baselines/*` — learned baseline status
- `/vessel-profiles` — expose the type profile table
- `/edge-node/alert` — SeaPod ingestion endpoint

The satellite catalog endpoint is where the progressive window widening lives — it tries three increasingly generous search windows in a row before giving up.

### 8.5 Edge Node Endpoint

`POST /api/edge-node/alert` is the SeaPod path. It accepts a JSON payload with `node`, `target`, `lat`, `lon`, `distance_m`, `heading_deg`, `confidence`, and `stream_url`. It then:

1. Optionally applies GPS transposition (demo magic — raw Philly coordinates can be offset into the mid-Atlantic).
2. Scales the physical pool distance (1.2 meters) into nautical miles using a scale factor of about 6173 so the 1.2 m becomes ~4 nm.
3. Uses the heading and scaled distance to compute the detected target's lat/lon via great-circle math.
4. Creates or updates a `VesselORM` for the SeaPod itself (type `sensor_node`) and a separate `VesselORM` for the detected target (type `other`, name "UNIDENTIFIED DARK VESSEL").
5. Inserts position reports for both.
6. Generates an `AlertORM` with `anomaly_type=dark_ship_optical`, severity based on the CV confidence, explanation including the node name, range, and confidence, and `stream_url` stored on the signal so the frontend can embed the live video.

The payload is small on purpose. The Pi does the perception (YOLO object detection on the embedded camera), and HarborOS only receives the detection metrics. That keeps the edge node bandwidth low and makes the mesh vision (many nodes, one operator picture) practical.

## 9. Anomaly Detection — All 12 Detectors, With the Research Behind Them

Every detector in `anomaly_detection.py` is a standalone function with a consistent signature: it takes a vessel, its recent positions, optional geofences and weather context, and returns a list of `AnomalySignalSchema`. The orchestrator runs all of them against every vessel during each detection cycle and concatenates the results.

### 9.1 Loitering Detection — PMC 2023 F(c) Formula

**Academic source:** "Loitering Behavior Detection by Spatiotemporal Characteristics" (PMC 2023, `https://pmc.ncbi.nlm.nih.gov/articles/PMC10557514/`). The paper reports 97% overall accuracy and 92% F-score across 137 test trajectories.

**Formula:**
```
F(c) = (Σ|ΔCourse| × Σ Speed) / (180° × BoundingBoxArea)
```

In plain English: how much is the vessel turning, how fast is it going, and how small is the area it is confined to? Higher values mean more suspicious. This captures loitering — movement with frequent course changes in a confined area — distinctly from anchoring, which is a stationary behavior.

**Anchor exclusion:** If the bounding box is less than 0.17 nm² and the average speed is under 3 kt, the vessel is anchored, not loitering. Skip it. This is the single most important guardrail against false positives in a busy anchorage.

**Window:** Last 30 positions, minimum 5 reports and 5 minutes of span.

**Severity:** `min(0.55, 0.15 + log10(max(F(c), 1)) * 0.10)`, then multiplied by a vessel-type severity multiplier. Fishing boats get 0.25× (loitering is literally their job). Passenger vessels get 1.3× (they should be on predictable schedules).

**Weather interaction:** If visibility is under 2 nm (fog), loitering detection is suppressed entirely. A cargo ship slowing down and making small course changes in fog is being careful, not suspicious.

**Why this over a hand-rolled rule:** An earlier version used a naïve "speed < 2 kt for N minutes" rule, which fired constantly on anchored vessels, was blind to vessels loitering at 4 kt, and had no way to distinguish real loitering from careful navigation in tight quarters. The F(c) formula is research-backed, published, and accounts for bounding box, speed, and course change simultaneously. It is the right primitive to build on.

### 9.2 AIS Gap Detection — IMO Resolution A.1106(29) / ITU-R M.1371

**Academic source:** IMO Resolution A.1106(29) and ITU-R M.1371, the international standards that define mandatory AIS reporting intervals for Class A transponders. Operators must report on a speed-dependent schedule:

| Ship Status | IMO Mandated Interval |
|---|---|
| At anchor, < 3 kt | 3 minutes |
| Underway, 0–14 kt | 10 seconds |
| Underway, 0–14 kt, changing course | 3.3 seconds |
| Underway, 14–23 kt | 6 seconds |
| Underway, 14–23 kt, changing course | 2 seconds |
| Underway, > 23 kt | 2 seconds |

**Insight from the research summary:** A ship doing 15 kt that has not reported in 30 seconds is already unusual. A 10-minute blanket threshold is absurdly conservative compared to what IMO expects. HarborOS is speed-dependent, not blanket-threshold.

**Alert thresholds:**
| Speed | Alert if gap >|
|---|---|
| < 3 kt | 15 minutes |
| 3–14 kt | 6 minutes |
| 14–23 kt | 4 minutes |
| > 23 kt | 3 minutes |

**Severity:** `min(0.55, 0.15 + log1p(gap_ratio / 100) * 0.15)`, where `gap_ratio = actual_gap / expected_interval`. Fast vessels (> 14 kt) get a 15% severity boost because a fast ship going dark is more alarming than a slow one.

### 9.3 Dark Vessel Detection — Global Fishing Watch Methodology

**Academic source:** Global Fishing Watch's analysis of 28 billion AIS signals from 2017–2019. That study found over 55,000 deliberate AIS disabling events, representing roughly 6% of all global fishing activity and about 1.6 million hours of untracked movement per year. The three hottest geographies were waters adjacent to Argentina, the West African coast, and the Northwest Pacific.

**Difference from gap detection:** Gap detection catches a gap *within* a track ("you went silent for 12 minutes between reports"). Dark vessel detection catches a vessel that has *stopped transmitting entirely* and is overdue based on its most recent known speed.

**Algorithm:**
1. Require ≥ 4 historical positions.
2. Compute `minutes_since_last_report` against current time.
3. Compute a dark threshold of `2.5 × speed_gap_threshold` for the vessel's last known speed.
4. Require ≥ 3 consecutive regular intervals *before* the silence to confirm the vessel was actively transmitting and did not just appear with a single ping.

**Severity:** `min(0.55, 0.25 + (minutes_dark / 60) * 0.15)`, with a 10–15% boost for faster vessels.

### 9.4 Geofence Breach Detection — Ray-Cast Point-in-Polygon

**Algorithm:**
1. For each geofence of type `restricted`, `security`, or `environmental`, parse the GeoJSON polygon.
2. Test the last 10 positions against the polygon using a ray-casting point-in-polygon algorithm (standard computational geometry — shoot a ray from the point to infinity, count intersections with polygon edges, odd = inside, even = outside).
3. Compute severity.

**Severity:**
```
base           = 0.9 if zone severity == "high" else 0.6
depth_factor   = 0.4 + 0.6 * (positions_inside / positions_checked)
speed_factor   = 0.5 + 0.5 * min(latest_speed / 15, 1.0)
final          = min(0.65, base × zone_mult × depth_factor × speed_factor)
```

The `zone_mult` comes from the vessel profile. Tugs get 0.5× because they *belong* inside harbors. Cargo ships get 1.2× because they do not belong inside restricted berths.

**Why this and not GIS libraries:** A pure-Python ray-casting function is ~15 lines, has no external dependencies, and is fast enough for ~500 vessels × 10 positions × ~10 geofences per detection cycle.

### 9.5 Zone Lingering Detection

Flags vessels that spend more than 20 minutes inside a security or restricted zone. Severity scales linearly with time spent, capped at 0.60 after 60 minutes. This is the "why are you still here" signal — distinct from a one-time breach.

### 9.6 Kinematic Implausibility Detection (Spoofing)

Cross-checks position jumps against physical constraints. For consecutive position pairs, computes implied speed from haversine distance divided by time delta. Flags any implied speed over 50 kt as physically impossible. Jumps over 10 nm are labeled "almost certainly a data error" and capped at severity 0.40 (because they are more likely to be bad data than real spoofing). Three or more impossible jumps in a single window trigger a "possible position spoofing or severe equipment malfunction" label.

This catches the class of attack where a GPS spoofer injects false positions into a vessel's AIS broadcast. The implied-speed check is a simple, robust sanity check: no ship goes from here to there in that amount of time, so either the previous position is wrong or the current one is.

### 9.7 Speed Anomaly Detection

Detects unusual acceleration/deceleration events. Counts consecutive speed changes exceeding a type-specific threshold (cargo 3 kt, fishing 5 kt, tug 4 kt, military 8 kt, etc.). Requires ≥ 2 rapid changes. Max changes over 50 kt are capped (data error). Also includes a learned-baseline z-score comparison: if the vessel's average speed is more than 2.5 standard deviations from the regional learned mean, add contribution.

**Weather adjustment:** In heavy weather (wind > 25 kt), the speed threshold is widened 50%. A vessel making a 5-kt speed change in heavy seas is probably just being thrown around, not evading.

### 9.8 Heading Anomaly Detection

Flags excessive course changes for underway vessels. Only applies when average speed is ≥ 2 kt (moored vessels swing at anchor and should not be flagged as erratic). Turn threshold is type-specific — cargo 30°, fishing 60° (they *should* be turning constantly), passenger 20° (they should hold course). Requires ≥ 5 large turns to trigger.

### 9.9 Statistical Outlier Detection

**Academic source:** "Outlier Detection in Maritime Environments Using Deep Learning" (arxiv 2024, `https://arxiv.org/html/2406.09966v1`). That paper uses a Bidirectional GRU encoder-decoder trained on 100 days of US coastal AIS data (472,000+ vessel-day samples) and flags anomalies when reconstruction error exceeds six sigma above the mean.

HarborOS does not ship the neural network because training and hosting it is out of scope for an MVP. Instead, it uses a simpler z-score approach with the same intent: compute the vessel's mean speed and speed variance, compute the z-score of the vessel's speed standard deviation against the regional fleet's, also compute heading variance ratio (only penalize *above-normal* variability — a calm vessel should not be flagged for being calm), and combine them as `(speed_z × 0.6) + (heading_excess × 0.4)`. Trigger if combined deviation ≥ 1.0.

### 9.10 Collision Risk Detection — Mou et al. 2021 CPA/TCPA with Encounter Angle

**Academic source:** Mou et al. 2021, "Quantitative Collision Risk Calculation" (Oxford Academic, `https://academic.oup.com/jcde/article/8/3/894/6275214`). This is the most widely-cited collision risk formula in the modern maritime safety literature.

**Formula:**
```
CR = exp(-DCPA / 1.5) × exp(-TCPA / 12) × F_angle_adjusted
```

Where:
- **DCPA** = Distance at Closest Point of Approach (nautical miles)
- **TCPA** = Time to Closest Point of Approach (minutes)
- **F_angle** = encounter-type multiplier: head-on 1.0, crossing up to 8.5 (peaks at exactly 90° beam crossing), overtaking 2.34

**What the multiplier captures:** Research shows that about 60% of maritime collisions come from human error, specifically poor situational awareness (24%) and inadequate lookout (23%). Crossings are the most dangerous because COLREGS Rule 15 (one ship gives way, one stands on) leads to confusion. Head-on encounters are clearer because both ships must turn right (Rule 14). Overtaking is defined by Rule 13 — the overtaking vessel must keep clear.

**CPA / TCPA computation:**
```
v1_x = speed₁ × sin(course₁)    v1_y = speed₁ × cos(course₁)
v2_x = speed₂ × sin(course₂)    v2_y = speed₂ × cos(course₂)

dx = (lon₂ - lon₁) × 60 × cos(lat₁)
dy = (lat₂ - lat₁) × 60
dvx = v2_x - v1_x
dvy = v2_y - v1_y

TCPA = -(dx × dvx + dy × dvy) / (dvx² + dvy²)
DCPA = √((dx + dvx × TCPA)² + (dy + dvy × TCPA)²)
```

**Candidate filtering:** Both vessels must be moving (> 2 kt). Distance must be < 1.5 nm. TCPA ∈ [0, 30 minutes].

**Smooth angular transitions:** The original 2010 formula had abrupt jumps at encounter-type boundaries (e.g., at 45° and 60°, risk would suddenly change). The 2021 version introduced cosine interpolation in 45°–60° and 150°–165° zones to eliminate false risk spikes. HarborOS implements the smooth version.

**COLREGS compliance adjustment:**
- If the vessel is actively maneuvering (avg heading change > 8°), severity is reduced to 25% — it is doing what it is supposed to do.
- If the vessel is dead-steady (< 3°) on a collision course, severity is boosted 30% — that is exactly the suspicious "I see you and I'm not moving" behavior that COLREGS is designed to prevent.

**Why collision risk gets the lowest weight (0.40) in the overall score:** Collision risk is a safety signal, not a defense signal. Two cargo ships with a close CPA are a safety-of-navigation concern, not a security threat. HarborOS includes collision risk because it is a useful operator signal and because it is a natural secondary indicator (a vessel behaving weirdly in traffic might be both unsafe *and* suspicious), but the weight is deliberately lower than the defense-relevant signals.

### 9.11 Route Deviation Detection

Uses the learned baseline's position density grid (0.01° grid cells, ~1.1 km per side). A position is "off-corridor" if it is more than 5 grid cells (~5.5 km) from any cell that has seen significant historical traffic. Requires ≥ 2 of the last 5 positions to be off-corridor. Severity scales with both the ratio of off-corridor positions and the maximum distance from a known corridor cell.

### 9.12 Type Mismatch Detection

**Academic source:** "Ship Classification and Anomaly Detection Based on AIS" (PMC 2022, `https://pmc.ncbi.nlm.nih.gov/articles/PMC9611351/`). That paper analyzed 62 million AIS messages from Chinese satellites, classifying five vessel types. Dimensions alone gave 73% accuracy; adding behavioral features (speed patterns, voyage distance, movement range) boosted accuracy to 93%. The paper showed real-world cases of vessels broadcasting false type codes — e.g., MMSI 367588710 registered as "cargo" but clearly fishing based on trajectory.

**Checks:**
1. Speed mismatch — average speed significantly outside the expected range for the declared type. Vessels at anchor (< 3 kt) are explicitly excluded so slow ≠ wrong type.
2. Heading variance mismatch — cargo, tanker, or passenger with avg heading change > 40° (they should hold course), OR a fishing vessel with avg heading change < 5° at > 10 kt (they should be erratic during fishing operations).

## 10. Vessel Type Profiles — The Anti-False-Positive Layer

The profile table in `vessel_profiles.py` is the single most important reason HarborOS does not drown operators in noise. Detectors are type-aware: what is suspicious for a cargo ship is normal for a fishing boat, and vice versa.

| Parameter | Cargo | Tanker | Fishing | Tug | Passenger | Pleasure | Military | Law Enf. |
|---|---|---|---|---|---|---|---|---|
| Speed range (kt) | 5–18 | 4–16 | 0–12 | 0–14 | 8–25 | 0–20 | 0–35 | 0–30 |
| Typical speed | 12 | 10 | 5 | 6 | 18 | 8 | 15 | 12 |
| Loiter tolerance (min) | 15 | 25 | 120 | 60 | 10 | 60 | 90 | 90 |
| **Loiter severity mult** | **1.0** | 0.8 | **0.25** | 0.3 | **1.3** | 0.4 | 0.15 | 0.15 |
| Large turn threshold (°) | 30 | 25 | 60 | 45 | 20 | 45 | 60 | 60 |
| **Heading severity mult** | **1.0** | 1.0 | **0.25** | 0.4 | **1.3** | 0.35 | 0.15 | 0.15 |
| AIS gap tolerance (min) | 10 | 10 | 30 | 15 | 5 | 30 | 60 | 30 |
| Zone severity mult | 1.2 | 1.0 | **1.5** | **0.5** | 1.3 | 1.0 | 0.2 | 0.15 |
| Speed delta threshold (kt) | 3 | 3 | 5 | 4 | 3 | 5 | 8 | 8 |

Design notes:
- **Fishing boats** get a 75% severity reduction for loitering and heading changes — both are literally what fishing boats do — but a *50% increase* for zone breaches. They are allowed to loiter and turn; they are not allowed to be in restricted terminals.
- **Military and law enforcement** get about 85% severity reductions across the board. They are authorized to operate freely in restricted zones, maintain radio silence, and move unpredictably.
- **Passenger vessels** get *increases* for loitering, heading anomalies, and zone breaches because they are supposed to be on predictable schedules.
- **Tugs** get reduced zone severity because they work inside harbors.
- Unknown vessel types fall back to a default profile with moderate thresholds (effectively: behave like a cargo ship, but a little looser).

Every detector reads the profile before calculating severity. That is how you get a system that treats a fishing boat making hairpin turns as normal fishing operations but treats a cargo ship making hairpin turns as a priority alert.

## 11. Signal Aggregation and Defense-Relevance Weighting

Once the detectors have run, `risk_scoring.py` combines their outputs into a single 0–1 composite severity using defense-relevance weights.

| Signal Type | Weight | Rationale |
|---|---|---|
| Dark Ship (Optical) | 1.00 | No AIS at all — highest threat indicator. This is what SeaPod detects. |
| AIS Gap | 1.00 | Intentional "going dark" — core MDA signal. |
| Kinematic Implausibility | 0.95 | GPS spoofing indicator. |
| Geofence Breach | 0.90 | Restricted zone violation — interdiction trigger. |
| Type Mismatch | 0.85 | Identity deception — smuggling, false registry. |
| Route Deviation | 0.80 | Off-corridor — sanctions evasion, smuggling. |
| Loitering | 0.75 | Surveillance, rendezvous, drop-off. |
| Zone Lingering | 0.70 | Critical infrastructure proximity. |
| Speed Anomaly | 0.60 | Evasive maneuvering. |
| Heading Anomaly | 0.55 | Search patterns, evasion. |
| Statistical Outlier | 0.50 | Behavioral deviation vs. fleet. |
| Collision Risk | 0.40 | COLREGS non-compliance (safety, not defense). |

**Aggregation formula:**
```
For each anomaly type that fired:
    contribution = weight × max(severities of this type)
    contribution += min(extra_signals, 2) × 0.03     # Diminishing returns

total = sum of all contributions

Diversity bonus:
    2 distinct signal types → total × 1.08
    3+ distinct signal types → total × 1.18

composite = min(1.0, total / 3.5)
```

**Why 3.5 as the divisor:** It is calibrated so a single moderate signal alone is negligible. A 0.3-severity signal with a weight of 0.75 produces a composite of only about 0.064, which is well below any fuzzy "low" membership. Escalation requires multiple strong, defense-relevant signals to converge, which is exactly the behavior an operator wants.

**Why the diversity bonus:** A vessel with three different types of suspicious signals is more alarming than a vessel with a single strong signal firing multiple times in a row. Diversity is evidence of a real pattern, not a glitch. The bonus is capped at 18% so it does not dominate.

**Metadata deficiency** is scored independently by weighted missing fields:
- IMO number: 0.30
- Flag state: 0.25
- Callsign: 0.20
- Vessel name: 0.15
- Destination: 0.10

The weights follow maritime security practice: IMO is the unique, permanent vessel identifier (never changes during the vessel's lifetime); flag state determines boarding and inspection rights; callsign is the radio identifier; name is the visual identifier; destination is optional for local traffic.

**Inspection risk** is simply `min(1.0, deficiencies / 5)`. Five or more Port State Control deficiencies = maximum inspection risk.

## 12. Fuzzy Risk Inference Engine

This is the math-heavy core of the scoring pipeline. It lives in `fuzzy_risk.py` and is a standard Mamdani fuzzy inference system.

### 12.1 Why Fuzzy Logic and Not a Weighted Sum

The blunt reason is that fuzzy logic handles uncertainty and overlap better than hard thresholds. Real maritime situations do not have clean boundaries. Is a vessel at 0.09 nm from another "safe" and at 0.11 nm "dangerous"? A hard threshold says yes. Fuzzy logic says the risk increases gradually across a range, which matches how operators actually think.

The research community predominantly uses fuzzy logic for maritime risk scoring, and the most advanced systems use Adaptive Neuro-Fuzzy Inference Systems (ANFIS) where the rules are learned from data rather than hand-written. HarborOS uses hand-written rules because there is no labeled training corpus, and because hand-written rules are explainable in a way a neural network is not.

### 12.2 Input Membership Functions

Three inputs, each normalized to [0, 1]:

**Anomaly severity** (the composite from signal aggregation):

| Set | Shape | Parameters |
|---|---|---|
| Negligible | Trapezoid | (0, 0, 0.08, 0.18) |
| Low | Triangle | (0.10, 0.25, 0.40) |
| Medium | Triangle | (0.30, 0.50, 0.70) |
| High | Triangle | (0.60, 0.78, 0.90) |
| Critical | Trapezoid | (0.82, 0.92, 1.0, 1.0) |

**Metadata deficiency:**

| Set | Shape | Parameters |
|---|---|---|
| Complete | Trapezoid | (0, 0, 0.1, 0.25) |
| Partial | Triangle | (0.15, 0.40, 0.65) |
| Poor | Trapezoid | (0.55, 0.75, 1.0, 1.0) |

**Inspection risk:**

| Set | Shape | Parameters |
|---|---|---|
| Clean | Trapezoid | (0, 0, 0.1, 0.3) |
| Moderate | Triangle | (0.2, 0.45, 0.7) |
| Poor | Trapezoid | (0.6, 0.8, 1.0, 1.0) |

### 12.3 Output Membership Functions

Five output sets over the 0–100 risk score, with deliberately wide separation so centroid defuzzification produces a continuous spread rather than attractor plateaus:

| Set | Shape | Parameters | Peak |
|---|---|---|---|
| Safe | Trapezoid | (0, 0, 5, 12) | 2.5 |
| Low | Triangle | (8, 20, 42) | 20.0 |
| Medium | Triangle | (35, 52, 70) | 52.0 |
| High | Triangle | (62, 78, 92) | 78.0 |
| Critical | Trapezoid | (85, 95, 100, 100) | 97.5 |

### 12.4 The Rule Base (16 rules)

The governing principle: **anomaly severity drives risk; metadata and inspection amplify but do not create.**

| # | Anomaly | Metadata | Inspection | → Risk |
|---|---|---|---|---|
| 1 | Negligible | Complete | Clean | Safe |
| 2 | Negligible | Complete | * | Safe |
| 3 | Negligible | Partial | * | Safe |
| 4 | Negligible | Poor | * | Safe |
| 5 | Low | * | * | Low |
| 6 | Low | Poor | * | Medium |
| 7 | Medium | * | * | Medium |
| 8 | Medium | Poor | * | High |
| 9 | Medium | * | Poor | High |
| 10 | High | * | * | High |
| 11 | High | Poor | * | Critical |
| 12 | High | * | Poor | Critical |
| 13 | Critical | * | * | Critical |
| 14 | Negligible | Poor | Poor | Medium |
| 15 | Low | Partial | Moderate | Medium |
| 16 | Low | Poor | Poor | High |

Rules 14–16 are the "profile boost" rules. They acknowledge that a vessel with consistently missing metadata AND an inspection history full of deficiencies deserves elevated scrutiny even when no live anomaly signals are currently firing. This is how HarborOS represents "this is a shady-looking vessel regardless of what it's doing right now."

### 12.5 Defuzzification

This is where I have a non-obvious design choice worth knowing for an interview.

Standard Mamdani defuzzification uses the centroid of the aggregated fuzzy output — the weighted average x-position under the curve. This works, but in practice it creates **attractor plateaus**: when only one output set fires, the centroid always converges to roughly the same value regardless of how strongly the rule activated. Two very different inputs can land on almost the same score.

To break that, HarborOS uses a blended defuzzification:

```
centroid   = standard Mamdani centroid over 200-point resolution
wmom       = Σ(set_peak × activation_strength) / Σ(activation_strength)
base_score = 0.6 × centroid + 0.4 × wmom
```

The 60/40 blend gets you the continuous smoothness of centroid with the peak-pulling of weighted mean of maxima.

Then there is an input-proportional spread to further distribute scores within a band:

```
spread      = (anomaly_severity - 0.15) × 0.3 × base_score
final_score = clamp(base_score + spread, 0, 100)
```

This ensures two vessels in the same fuzzy band but with different raw severities do not land on identical scores. Operators notice when everything is 78 — a small amount of spread keeps the histogram looking alive.

## 13. MARSEC Action Mapping

The final 0–100 score maps to an ISPS-aligned action. ISPS (International Ship and Port Facility Security Code) is the international standard adopted after 9/11 under SOLAS Chapter XI-2, and any system designed for defense or port security customers should align with it.

| Score | Action | MARSEC Level | Meaning |
|---|---|---|---|
| 80–100 | **ESCALATE** | MARSEC 3 | Exceptional security level — immediate interdiction response, area restrictions, full asset deployment |
| 60–79 | **VERIFY** | MARSEC 2 | Heightened — dispatch verification asset (camera, satellite, drone, patrol) to confirm identity and intent |
| 35–59 | **MONITOR** | MARSEC 1 (elevated) | Normal operations with elevated awareness — track vessel and log activity |
| 0–34 | **NORMAL** | Below MARSEC 1 | Routine traffic — no action required |

**Important implementation detail:** The alert service uses these bands as *operational filters*, not just labels. Anything scoring below 35 is either ignored or auto-resolved if it was previously alerted. Collision-risk-only alerts are explicitly suppressed unless there is at least one other suspicious signal alongside — otherwise any two ships meeting in a busy harbor would flood the alert feed.

## 14. Learned Baselines and Pattern Learning

`pattern_learning.py` builds per-region per-type historical baselines from the Parquet archive. For each combination of region (LA Harbor, Black Sea, etc.) and vessel type (cargo, tanker, fishing, etc.), it computes:

- **Speed statistics:** mean, standard deviation, 5th percentile, 95th percentile
- **Heading change statistics:** mean and standard deviation of turn magnitudes
- **Position density grid:** a grid of 0.01° cells (~1.1 km per side), with each cell containing a count of historical positions

The baselines are loaded via pyarrow (Parquet) with a SQLite fallback. Two detectors rely on them:

- **Statistical outlier** uses the speed and heading change distributions to z-score the vessel against its peers.
- **Route deviation** uses the position density grid — if the vessel is more than 5 grid cells from the nearest "hot" cell, it is off-corridor.

This is the layer where HarborOS does something close to machine learning without shipping an actual model. The baselines are pre-computed from the archive and refreshed in the background, so scoring is fast and deterministic.

## 15. Ingestion, Archive, and Data Retention

`ingestion_service.py` runs in-process as an asyncio background task. It connects to AISStream.io, subscribes to the regional bounding boxes, and consumes messages. Incoming messages are batched — 50 messages or 2 seconds, whichever comes first — and then committed in a single SQLAlchemy transaction. Batching is what makes the ingestion path fast; committing every message one at a time would be a bottleneck.

Every 30 seconds, a background alert loop wakes up, runs `generate_alerts_for_all_vessels`, and writes new alerts and risk history points. Every 10 cycles (about 5 minutes), it also runs the archive service to roll old positions into Parquet.

`archive_service.py` uses a pyarrow Parquet schema with snappy compression and 50,000-row row groups. It keeps the most recent `RETENTION_MINUTES = 30` minutes of positions in SQLite for detection purposes and archives anything older into hourly Parquet files named `positions_YYYY-MM-DD_HH-MM.parquet`. This is why the detector layer is fast: SQLite only holds the recent window, and the archive grows in the background without touching hot queries.

Risk history is pruned to the last 24 hours to keep the sparkline query light.

Edge-node vessels (anything prefixed `dark-` or `seapod-`) and demo vessels are skipped by the alert loop so they do not churn through the normal detection cycle.

## 16. Frontend Deep Dive

### 16.1 Shape of the App

```
frontend/app/
  page.tsx                      # Main dashboard, state, 5s polling
  lib/
    api.ts                      # API client + TypeScript types
    risk.ts                     # Shared risk thresholds & color helpers
  components/
    MapView.tsx                 # MapLibre GL, ~780 LOC
    AlertFeed.tsx               # Alert triage sidebar
    VesselDetail.tsx            # Vessel detail panel, ~1600 LOC
    VesselCompare.tsx           # Side-by-side comparison
    RiskDistribution.tsx        # Analytics histogram
    RegionSummary.tsx           # Region metadata strip
    Header.tsx                  # App header + region selector
    Timeline.tsx                # Scenario replay cursor
    DemoMode.tsx                # Demo walkthrough orchestrator
    FeatureTour.tsx             # First-run tour
    Toast.tsx                   # Notifications
```

The top-level `page.tsx` is a client component that manages global state (selected vessel, selected alert, region filter, status filter, map flyTo target) and runs a 5-second polling interval to refresh vessels and alerts. It uses React Suspense to wrap the search-params reader so the dashboard loads cleanly under Next 16.

### 16.2 MapLibre Integration

`MapView.tsx` is the primary operator interface. A few things are worth knowing:

- **Three map modes:** `maps` (standard labeled), `dark` (Carto dark matter), `satellite` (Copernicus Sentinel-2 when configured, Esri fallback otherwise). Switching modes calls `map.setStyle()` and re-adds geofences afterward in the `styledata` callback, because MapLibre wipes sources when you change styles.
- **Custom vessel SVG silhouettes:** Each vessel type has a hand-drawn SVG path. Cargo is boxy with container bays, tanker is rounded with a pipe, fishing is shorter and wider, tug is stocky, passenger is the longest, and military is narrow and aggressive. SeaPod nodes get a hexagonal buoy shape. SVGs instead of marker images because they scale cleanly at any zoom level.
- **Heatmap at low zoom, markers at high zoom:** Below zoom level 10, the map renders a density heatmap instead of individual markers. Above zoom 10, it renders individual vessel SVGs. `HEATMAP_ZOOM_THRESHOLD = 10`. This is the difference between a legible operator view at harbor zoom and a smeary mess at regional zoom.
- **Glow and pulse animations:** High-risk vessels get a drop-shadow glow and a CSS keyframe pulse. The CSS is injected as a global `<style jsx global>` block because MapLibre markers live outside React's virtual DOM.
- **Vessel trails:** When a vessel is selected, the map fetches its position history and draws a multi-line-string trail. The trail is broken into segments at implausible position jumps — any implied speed above 60 kt starts a new segment — so the line does not draw straight across land when AIS data teleports.
- **Satellite imagery overlay:** A raster image source can be attached to a bounding box on the map, with 0.9 opacity, for satellite verification previews.
- **Legend + toggles:** Bottom-left legend shows risk tier colors and zone types; bottom-right has the base map toggle (Maps / Dark / Satellite); a "hide normal vessels" toggle filters out everything below MONITOR.

### 16.3 Alert Feed

`AlertFeed.tsx` is a left-hand sidebar with:

- A search input that filters by vessel name, MMSI, recommended action, or signal type.
- Sort buttons for Risk, Name, Time (ascending/descending).
- Status filter buttons — Active (default) vs. All.
- A scrollable list of alerts with name, risk score, action badge, time-ago label, and a one-line summary of which signals fired.
- Selected alerts highlight with a blue border, resolved alerts fade to 50% opacity, and clicking an alert flies the map to the vessel.
- Load-more pagination when there are more alerts than are shown.

The component is pure UI — all the filtering and sorting logic lives in `useMemo` hooks with no side effects.

### 16.4 Vessel Detail Panel

`VesselDetail.tsx` is the most complex component in the frontend (~1600 lines). It shows everything an operator needs about a contact:

- Vessel metadata (name, MMSI, type, flag, IMO, callsign, destination, dimensions)
- Current course, speed, heading, and position
- Risk score with color-coded tier and action badge
- A **risk sparkline** — a small SVG chart of the last 6 hours of risk scores with threshold bands (monitor/verify/escalate), a trend arrow (escalating/stable/de-escalating), and a current-value dot
- The list of triggered anomaly signals with severity badges and human-readable descriptions
- A generated explanation string that leads with the most severe finding in plain language
- Weather context (wind, visibility, temperature) when available
- Inspection history (deficiency count, last inspection date)
- Satellite imagery browser (vessel-centered or map-focus-centered) with date pickers, cloud-cover slider, and acquisition list; clicking an acquisition overlays it on the map
- Verification request button (creates a satellite task for the current vessel or focus point)
- Alert action buttons (acknowledge, dismiss, escalate, add notes, add feedback)
- Export report button

### 16.5 Shared Risk Utility

`lib/risk.ts` holds `RISK_THRESHOLDS` ({ monitor: 35, verify: 60, escalate: 80 }) and color helpers so every component colors scores consistently. One source of truth avoids the classic bug where the map says a vessel is "verify orange" and the alert feed says the same vessel is "monitor yellow."

## 17. SeaPod: The Physical Edge Node Story

SeaPod is the hardware story HarborOS tells alongside the software. It is a Raspberry Pi 5–based floating edge detection node with stereoscopic cameras, a NEO-6M GPS over UART, a SparkFun LSM6DSO IMU over I2C, and a Pi Camera running YOLO object detection. In the hackathon demo, it lives in a swimming pool and detects a rubber duck.

The point of SeaPod is *not* the pool or the rubber duck. The point is to show that HarborOS's pipeline already handles non-AIS detections as a first-class input. A $50 camera on a $100 Pi can contribute to the same alert feed, the same fuzzy risk scoring, and the same operator workflow as live AIS — because HarborOS treats "source of signals" as a plug-in surface and not a hardcoded assumption.

**The backend integration:**
- `POST /api/edge-node/alert` accepts the Pi's JSON payload
- GPS transposition optionally offsets real Philly coordinates into the mid-Atlantic (demo magic)
- Range scaling multiplies 1.2 m pool distance by a factor of ~6173 to get ~4 nm
- Great-circle math computes the detected target's lat/lon from the SeaPod's position, heading, and scaled distance
- A `dark_ship_optical` signal is created with weight 1.0 — the highest weight in the system, because "no AIS at all" is the strongest possible defense indicator
- The stream URL is stored so the frontend can embed a live MJPEG video feed in the detail panel

**The demo narrative:**
1. Judge sees HarborOS dashboard with live AIS vessels worldwide
2. Switch to the Atlantic demo region
3. SeaPod buoy appears as a blue icon
4. Red alert fires: "OPTICAL DARK SHIP DETECTION — SeaPod_Alpha"
5. Click the alert — map flies to the Atlantic, shows a red dashed line from buoy to target
6. Detail panel shows risk 96, "No AIS transponder detected"
7. Live camera feed shows the rubber duck with a YOLO bounding box
8. Operator clicks "Request Verification" to dispatch a drone
9. Narration: "This system just detected a vessel that does not exist in any AIS database, using only a $50 camera on a floating buoy."

The hardware is a hackathon prototype, but the integration surface is production-shaped.

## 18. Demo Scenarios and Seeded Vessels

`backend/app/seed.py` (~1350 lines) loads a rich LA Harbor demo scenario centered on 33.735°N, 118.265°W. The scenario was designed to exercise every detector at least once.

Key demo vessels:

- **MV DARK HORIZON** — Marshall Islands-flagged cargo vessel with missing IMO and callsign, 4 Port State Control deficiencies, and enriched with 7 converging anomaly signals. Risk = 100 / ESCALATE. The headline vessel of the demo.
- **JADE STAR** — AIS spoofing demonstration. Kinematic implausibility detector fires on implausible position jumps.
- **v-dark-optical-1** — Dark ship with no AIS at all. Exists only as an optical detection from the SeaPod pipeline.
- **AEGEAN VOYAGER** — Tanker zone lingering demonstration.
- **OCEAN PHANTOM** — Erratic fishing vessel with heading anomaly patterns.
- **NORTHERN SPIRIT** — AIS gap demonstration.
- **CASPIAN TRADER** — Loitering tanker near infrastructure.

Geofences:
- **APM Terminal** (restricted, high severity)
- **Main Channel** (shipping lane)
- **Anchorage A** (anchorage)
- **LNG Security Zone** (security, high severity)
- **Cabrillo Preserve** (environmental)

Plus regional geofences for Black Sea (Odesa, Sevastopol, Kerch), Strait of Hormuz, and Taiwan Strait, so switching regions shows different sets of zones.

## 19. Design Decisions and Tradeoffs

### 19.1 Why SQLite and Not Postgres

SQLite is zero-config, ships as one file, and handles the MVP workload comfortably. I am writing portable SQL so swapping to Postgres is a 30-minute migration if and when it matters. Shipping something that runs on one laptop is more valuable than shipping something that requires a database server.

### 19.2 Why REST Polling and Not WebSocket Push to the Frontend

The backend already uses a WebSocket to receive AIS data from AISStream. Adding a second WebSocket for server-to-frontend push would more than double the operational surface (two independent reconnect strategies, two different failure modes, two sets of authentication concerns). REST polling every 5 seconds is fine for this use case — the operator does not need sub-second updates, and the polling cycle makes the frontend state logic dramatically simpler. This is a deliberate trade of latency for simplicity.

### 19.3 Why Hand-Written Fuzzy Rules and Not ANFIS

ANFIS (Adaptive Neuro-Fuzzy Inference System) would learn the rules from labeled training data. I do not have labeled maritime training data, and collecting it would be a multi-month project on its own. Hand-written rules are also explainable in a way a trained network is not — I can point at a specific rule and say "this is why the score landed here." For a defense product where operators need to trust the system, explainability is the more important feature.

### 19.4 Why Per-Type Profiles Over Global Thresholds

Global thresholds would drown operators in false positives. A fishing boat loitering is not suspicious. A cargo ship loitering is. The type profile table encodes that distinction once, and every detector reads it, so the anti-false-positive logic lives in exactly one place instead of being duplicated across every detector.

### 19.5 Why Weather-Aware Detection

Weather is the single biggest source of benign anomaly signals. Ships slow down in heavy weather. They make larger course changes to compensate for wind and current. They stop and drift in fog. If the detectors did not account for weather, the alert feed would light up every storm as a security incident. Weather-aware detection widens speed and heading thresholds in heavy wind and suppresses loitering detection entirely in fog.

### 19.6 Why Progressive Window Widening on Satellite Search

Sentinel-2 revisit is 5 days, and cloudy passes are common. A one-shot search with a tight window will return empty results often enough that operators stop trusting the feature. The progressive windowing strategy tries narrow first, then widens twice before giving up, so operators get *something* in almost every case instead of nothing in many cases. The trade is that "recent" can mean up to 60 days back in bad weather regions, but the UI surfaces the actual acquisition time so operators know what they are looking at.

### 19.7 Why Centroid + Weighted-Mean-of-Maxima Blending

Pure centroid creates attractor plateaus. Pure WMoM produces discontinuous jumps. The 60/40 blend gets you the smoothness of centroid with the peak-pulling of WMoM. Adding an input-proportional spread on top breaks the last remaining plateaus so two vessels in the same fuzzy band with different raw severities do not collide on the same score.

### 19.8 Why Collision Risk Has the Lowest Weight

Collision risk is a *safety* signal, not a *defense* signal. Two cargo ships on a close CPA in a busy harbor are a safety-of-navigation concern, not a security threat. HarborOS includes collision risk because it is operationally useful and because a vessel behaving weirdly in traffic may also be behaving suspiciously, but the weight is deliberately lower than the defense-relevant signals so collision-only cases do not drown out the alert feed. The alert service even auto-suppresses collision-only alerts unless another signal is firing alongside.

### 19.9 Why Auto-Resolution of Alerts Below 35

Operator fatigue is real. An alert feed full of stale alerts that have already de-escalated is worse than a short feed with only live signals. The alert service actively re-scores existing alerts every cycle and auto-resolves anything that has dropped below the MONITOR threshold. The audit trail is preserved so operators can still see the history.

## 20. Known Limitations and What I'd Do Next

Honest about what is not done:

- **No auth, no multi-tenancy.** The MVP assumes a single-operator local deployment. Real production would need per-tenant databases and role-based access.
- **Precision is computed, recall is not.** The detection metrics endpoint reports precision (confirmed threats / total alerts) but does not report recall, lead time, or alert-quality scores. Those require a labeled ground-truth feed that the MVP does not have.
- **SQLite is fine for MVP but not production scale.** The schema is portable, so the migration to Postgres is straightforward, but it has not been done.
- **NWS coverage is US-only.** For non-US regions, weather enrichment returns None and detectors fall back to default thresholds. A European equivalent (OpenWeather, or national met services) would close that gap.
- **Verification is satellite-first.** The data model supports drone, patrol boat, and camera as asset types, but the backend only fully implements the satellite path today. Adding a drone or patrol-boat mock is a few hundred lines.
- **SeaPod mesh is single-node only.** The repo supports one edge node right now. The concept notes describe a larger mesh with multi-node fusion and deduplication, but that is concept-stage.
- **Learned baselines do not yet feed the risk sparkline.** Risk history is stored per vessel, but the fuzzy scorer does not currently consume the historical trend. A vessel that has been at 75 for 6 hours is scored the same as a vessel that just climbed to 75 in 5 minutes.
- **No scoring model evaluation pipeline.** There is no automated way to backtest a change to the fuzzy rules against a held-out dataset. A change to the rule base today is validated by running the seeded demo and eyeballing the results.

What I would prioritize next, in order:

1. **Recall metrics and labeled evaluation.** Set up a lightweight ground-truth labeling tool so operators can mark alerts as true/false positives, and compute recall + precision + F1 + lead-time from that. This is the single biggest thing standing between "plausible demo" and "operationally trustworthy product."
2. **Postgres migration and horizontal scaling.** Spin the ingestion worker and alert worker out into separate processes so the API server does not have to share an event loop with them.
3. **Drone and patrol-boat verification paths.** Mock them against the same verification task lifecycle used by satellite, so the UI shows a real multi-asset verification flow.
4. **Mesh SeaPod deduplication.** Two nodes seeing the same target should produce one merged contact, not two. This is spatial clustering on `(lat, lon, timestamp)` and is not hard.
5. **Temporal risk trends in the scorer.** Vessels whose risk has been sustained at a level for hours should score differently from vessels that just spiked.
6. **Commercial AIS integration.** If budget allows, plug in Spire or ExactEarth alongside AISStream so coverage is complete. The adapter pattern already supports multiple AIS sources in parallel.

## 21. Likely Interview Questions and Strong Answers

### Q: Why not just use machine learning for the whole scoring pipeline?

ML needs labeled training data. Maritime anomaly labels at scale do not exist in the public domain — the research papers I referenced use synthetic traffic or small hand-labeled corpora. Until I had a labeled feed, a heuristic pipeline was the only way to ship something explainable and operationally useful. The heuristic layer is also the easier path to operator trust: I can point at a specific detector, show the formula, show the paper it came from, and say "this is why this alert fired." Try doing that with a gradient-boosted model.

The design is deliberately ready for an ML layer on top. The detectors produce typed, weighted signals; the scorer produces explainable scores; the alert service has an audit trail. A future ML stage can consume the detector outputs as features and learn a better aggregation function than the fuzzy rules, without re-architecting anything.

### Q: Where does the AIS data come from?

AISStream.io — a free, public WebSocket-based AIS feed at `wss://stream.aisstream.io/v0/stream`. You subscribe with an API key and a list of bounding boxes, and the server streams position reports and static data messages in real time. Commercial AIS providers cost thousands to tens of thousands of dollars per month, and the free tiers of MarineTraffic and similar services do not include streaming. AISStream.io was built specifically to give researchers and hobbyists open access to the global AIS stream, and the free tier is generous enough for the regional bounding boxes HarborOS uses.

### Q: Why Copernicus Sentinel-2 and not a commercial provider?

Sentinel-2 is free, has 10-meter resolution, carries 13 spectral bands, revisits every 5 days, and is maintained by the European Union. Commercial providers — Planet Labs, Maxar, Airbus — charge for imagery and tasking. For an MVP, free is the right choice, and 10-meter resolution is good enough to distinguish vessels from their wake under good conditions.

The Copernicus Data Space Ecosystem (CDSE) is the modern API layer on top of the Sentinel archive. It uses OAuth2 client credentials, a STAC-style catalog search endpoint, and a "process" endpoint that renders a true-color image on demand from an evalscript. It replaced the old Copernicus Open Access Hub, which was being wound down when I built this.

### Q: How do you avoid drowning operators in false positives?

Three layers of guardrails. First, vessel type profiles — a fishing boat loitering is not a signal, because loitering is literally what fishing boats do. Second, weather-aware thresholds — heavy wind widens speed and heading thresholds, fog suppresses loitering detection entirely. Third, defense-relevance weighting and diversity bonus — a single moderate signal produces a negligible composite score, and the fuzzy engine requires multiple converging signals to cross into MONITOR or higher. On top of all that, the alert service auto-suppresses collision-risk-only alerts and auto-resolves any alert that drops below the MONITOR threshold.

### Q: Walk me through the risk scoring pipeline end to end.

Position reports come in from the ingestion loop and are batched into SQLite. Every 30 seconds, the alert service wakes up, iterates every vessel, and runs 12 detectors against its recent position history. Each detector is vessel-type-aware — it reads the type profile for thresholds and severity multipliers. Detectors return zero or more typed signals with severity in [0, 1].

The signals are weighted by defense relevance (dark ship optical 1.00, AIS gap 1.00, kinematic implausibility 0.95, ... collision risk 0.40) and combined with diminishing returns for repeat signals and a diversity bonus for multiple distinct types. The composite is normalized to [0, 1] by dividing by 3.5.

That composite, plus metadata deficiency (weighted missing fields) and inspection risk (Port State Control deficiency count), goes into a Mamdani fuzzy inference engine with 16 hand-written rules. Defuzzification is a 60/40 blend of centroid and weighted mean of maxima, plus an input-proportional spread to break attractor plateaus. The output is a 0–100 risk score.

The score maps to an ISPS-aligned action: ESCALATE at 80+, VERIFY at 60–79, MONITOR at 35–59, NORMAL below 35. The alert service creates or updates an alert, writes the explanation text, adds a risk history point, and prunes anything older than 24 hours.

The frontend polls `/alerts` and `/vessels` every 5 seconds and re-renders the operator view.

### Q: What's the math behind collision risk detection?

Mou et al. 2021 — the most widely-cited modern maritime collision risk formula. The core is:

```
CR = exp(-DCPA / 1.5) × exp(-TCPA / 12) × F_angle
```

DCPA and TCPA are Distance and Time to Closest Point of Approach, computed from relative position and relative velocity via standard CPA math. The F_angle multiplier encodes the encounter type: head-on 1.0, crossing up to 8.5 (peaks at exactly 90° beam crossing), overtaking 2.34. Crossings are the most dangerous because COLREGS Rule 15 creates stand-on/give-way confusion.

The 2021 paper improved on the original 2010 formulation by adding cosine-smoothed transitions at the encounter-type boundaries (45–60° and 150–165°) so the risk score does not have discontinuous jumps when a vessel rotates through one of those zones.

HarborOS then applies a COLREGS compliance adjustment: if the vessel is actively maneuvering (avg heading change > 8°), severity is reduced to 25% because it is doing what it is supposed to be doing; if the vessel is dead-steady (< 3°) on a collision course, severity is boosted 30% because that is exactly the suspicious behavior COLREGS is designed to prevent.

### Q: Why MARSEC thresholds at 35 / 60 / 80?

ISPS Code MARSEC is a 1-to-3 scale: MARSEC 1 is normal operations with routine monitoring, MARSEC 2 is heightened (credible threat identified, enhanced screening), MARSEC 3 is exceptional (imminent or active incident). Those three levels need to map onto a continuous 0–100 score.

I reserved 0–34 as "below MARSEC 1" — genuinely normal traffic that does not need operator attention. The 35 threshold is where I want operators to start seeing something in the feed at all. 60 is where the recommendation starts including "verify before you act" — dispatch a verification asset. 80 is where the recommendation is "act now" — escalate to interdiction posture.

The bands are also operational filters, not just labels. Below 35, the alert service ignores or resolves the alert. That means the operator's alert feed is never showing vessels that are trivially below threshold.

### Q: What would you do differently if you started over?

Probably two things. First, I would set up the labeled ground-truth feed and recall metrics earlier. Without it, every change to the scoring pipeline is validated by eyeball, and I know there are corners of the parameter space I have not exercised. Second, I would separate the ingestion worker and alert worker from the API server as independent processes from day one. Right now they share an event loop, which is fine for an MVP but would bite later.

Everything else — the fuzzy engine, the detector stack, the type profiles, the adapter pattern for external APIs — I would keep. The architecture has held up well under changes and the separation of concerns has made it easy to add new detectors or new signal types without touching the rest of the system.

### Q: What is the single most interesting thing you learned building this?

How much of maritime anomaly detection is about what *not* to alert on. The hard part is not finding suspicious behavior — it is suppressing all the benign behavior that looks suspicious at first glance. Fishing boats loiter. Tugs live inside restricted zones. Ships slow down in fog. Cargo vessels drift at anchor. Building a detector is maybe 30% of the work; building the right guardrails around it — vessel type profiles, weather awareness, anchor exclusions, diminishing returns on repeat signals, alert auto-resolution — is the other 70%. That is the part the research papers rarely talk about, and it is the part that decides whether an operator trusts the system or turns it off.

### Q: Pitch it in 60 seconds.

HarborOS is the operating system for harbor defense. It ingests live vessel traffic from AISStream, runs 12 research-backed anomaly detectors — loitering using the PMC 2023 F(c) formula, AIS gap detection against IMO Resolution A.1106(29), collision risk using Mou et al. 2021, dark-vessel detection using Global Fishing Watch methodology — weights each signal by defense relevance, combines them through a Mamdani fuzzy engine with 16 rules, and produces an ISPS-aligned operator action: ignore, monitor, verify, or escalate. Every alert is explainable — operators see exactly which signals fired and why. Verification is a first-class concept, backed today by free Copernicus Sentinel-2 satellite imagery and ready to dispatch drones or patrol boats tomorrow. And the pipeline already accepts non-AIS optical detections from a $100 edge node, so the same decision layer scales from "free public AIS" to "$50 cameras on floating buoys" without rewriting the scoring engine. Cheap sensing plus software triage plus a fast verification loop beats exquisite stovepiped systems you cannot afford to deploy widely. That is the thesis. That is the product.

---

*Every formula, threshold, weight, and code path in this brief is drawn from the actual source in `backend/app/services/`, `backend/app/data_sources/`, and `frontend/app/`. Every external API is one I chose specifically for HarborOS. Every design decision has a reason and I can defend it.*
