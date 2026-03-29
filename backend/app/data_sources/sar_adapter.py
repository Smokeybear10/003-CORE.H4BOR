"""
Sentinel-1 SAR adapter for SAR imagery and wake detection overlays.

Mirrors the sentinel_adapter.py pattern but for Sentinel-1 C-band SAR data.
Provides WMTS tile URLs for MapLibre integration and real YOLOv8-OBB
wake-detection inference via the wake-det project.
"""

from __future__ import annotations

import logging
import math
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# wake-det project path and default weights
# ---------------------------------------------------------------------------

WAKE_DET_ROOT = Path(__file__).resolve().parents[4] / "wake-det"
DEFAULT_WEIGHTS = WAKE_DET_ROOT / "runs" / "obb" / "runs" / "fast_test_150" / "train" / "weights" / "best.pt"
DEFAULT_IMAGE_DIR = WAKE_DET_ROOT / "data" / "splits" / "test" / "images"

# Cached model instance (loaded once, reused across requests)
_cached_model = None
_cached_weights_path: str | None = None


# Sentinel Hub WMTS endpoint for Sentinel-1 IW GRD visualization
SENTINEL1_WMTS_URL = (
    "https://services.sentinel-hub.com/ogc/wmts/"
    "cd280189-7c51-45a6-ab05-f96a76067710"
    "?Service=WMTS&Request=GetTile&Version=1.0.0"
    "&Layer=SAR-URBAN"
    "&Style=default"
    "&Format=image/png"
    "&TileMatrixSet=PopularWebMercator512"
    "&TileMatrix={z}"
    "&TileCol={x}"
    "&TileRow={y}"
    "&TIME={time_range}"
)


def get_sentinel1_tile_url(days_back: int = 30) -> dict:
    """Get Sentinel-1 WMTS tile URL template for MapLibre."""
    end = datetime.utcnow()
    start = end - timedelta(days=days_back)
    time_range = f"{start.strftime('%Y-%m-%d')}/{end.strftime('%Y-%m-%d')}"

    tile_url = SENTINEL1_WMTS_URL.replace("{time_range}", time_range)

    return {
        "tile_url": tile_url,
        "source": "Sentinel-1 IW GRD (ESA Copernicus)",
        "time_range": time_range,
        "resolution": "10m (IW mode, VV polarization)",
        "mode": "IW",
        "polarization": "VV",
        "note": "C-band SAR backscatter — cloud-penetrating, day/night imaging.",
    }


def get_sentinel1_info() -> dict:
    """Get info about the Sentinel-1 SAR constellation."""
    return {
        "constellation": "Sentinel-1 (ESA Copernicus)",
        "satellites": ["Sentinel-1A"],
        "resolution": "10m (IW mode), 5m (EW mode)",
        "revisit_days": 6,
        "swath_width_km": 250,
        "frequency": "C-band (5.405 GHz)",
        "polarization": "VV + VH",
        "orbit": "Sun-synchronous, 693km altitude",
        "data_access": "Free via Copernicus Data Space",
    }


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _obb_to_polygon(cx: float, cy: float, w: float, h: float, angle_deg: float) -> list:
    """Convert an OBB (center + size + angle) to a 4-vertex GeoJSON ring."""
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    hw, hh = w / 2, h / 2
    corners = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
    pts = []
    for dx, dy in corners:
        rx = dx * cos_a - dy * sin_a + cx
        ry = dx * sin_a + dy * cos_a + cy
        pts.append([round(rx, 6), round(ry, 6)])
    pts.append(pts[0])
    return pts


# ---------------------------------------------------------------------------
# Model loading (cached singleton)
# ---------------------------------------------------------------------------

def _get_model(weights_path: str | Path | None = None):
    """Load the YOLO model once and cache it for subsequent calls."""
    global _cached_model, _cached_weights_path

    wp = str(weights_path or DEFAULT_WEIGHTS)
    if _cached_model is not None and _cached_weights_path == wp:
        return _cached_model

    from ultralytics import YOLO  # type: ignore
    logger.info("Loading YOLOv8-OBB model from %s", wp)
    _cached_model = YOLO(wp)
    _cached_weights_path = wp
    return _cached_model


# ---------------------------------------------------------------------------
# Real wake-detection inference
# ---------------------------------------------------------------------------

def run_wake_detection(
    image_path: str | Path,
    bbox: list[list[float]],
    weights_path: str | Path | None = None,
    confidence_threshold: float = 0.05,
) -> dict:
    """Run YOLOv8-OBB wake detection on a SAR image and return GeoJSON.

    Uses manual geographic bounds (bbox) to convert pixel-space detections
    to lat/lon coordinates — no GeoTIFF metadata required.

    Args:
        image_path: Path to the SAR image (PNG, TIFF, JPEG, etc.).
        bbox: Geographic bounding box as [[lat_min, lon_min], [lat_max, lon_max]].
            The image's top-left maps to (lon_min, lat_max) and bottom-right
            maps to (lon_max, lat_min) — standard image-to-geo convention.
        weights_path: Path to .pt weights (uses default if None).
        confidence_threshold: Minimum detection confidence.

    Returns:
        GeoJSON FeatureCollection with OBB polygon features.
    """
    import cv2  # type: ignore

    # Ensure wake-det source is importable
    wake_det_src = str(WAKE_DET_ROOT)
    if wake_det_src not in sys.path:
        sys.path.insert(0, wake_det_src)

    from src.inference.inference_pipeline import (
        tile_image,
        run_inference_on_tile,
        nms_obb,
    )

    # Load model (cached)
    model = _get_model(weights_path)

    # Read image
    image = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")
    if image.ndim == 2 or (image.ndim == 3 and image.shape[2] == 1):
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

    img_h, img_w = image.shape[:2]

    # Build pixel-to-geographic affine from manual bbox
    # bbox: [[lat_min, lon_min], [lat_max, lon_max]]
    lat_min, lon_min = bbox[0]
    lat_max, lon_max = bbox[1]

    # Pixel (0,0) = top-left = (lon_min, lat_max)
    # Pixel (W,H) = bottom-right = (lon_max, lat_min)
    px_to_lon = (lon_max - lon_min) / img_w
    px_to_lat = (lat_min - lat_max) / img_h  # negative: y increases downward

    def pixel_to_geo(px_x: float, px_y: float) -> tuple[float, float]:
        lon = lon_min + px_x * px_to_lon
        lat = lat_max + px_y * px_to_lat
        return lon, lat

    # Tile and run inference
    tiles = tile_image(image, tile_size=1024, overlap=128)
    all_detections: list[dict[str, Any]] = []

    for tile_info in tiles:
        tile_dets = run_inference_on_tile(
            model, tile_info["tile"], confidence_threshold=confidence_threshold
        )
        for det in tile_dets:
            cx, cy, bw, bh, angle = det["bbox"]
            det["bbox"] = [
                cx + tile_info["col_start"],
                cy + tile_info["row_start"],
                bw, bh, angle,
            ]
        all_detections.extend(tile_dets)

    logger.info("Pre-NMS detections: %d across %d tiles", len(all_detections), len(tiles))
    final_detections = nms_obb(all_detections, iou_threshold=0.45)
    logger.info("Post-NMS detections: %d", len(final_detections))

    # Convert pixel detections to GeoJSON features
    features = []
    for i, det in enumerate(final_detections):
        cx_px, cy_px, w_px, h_px, angle_rad = det["bbox"]
        angle_deg = math.degrees(angle_rad)

        # Convert center to geographic
        cx_geo, cy_geo = pixel_to_geo(cx_px, cy_px)

        # Convert dimensions: pixel size → degree size
        w_deg = abs(w_px * px_to_lon)
        h_deg = abs(h_px * px_to_lat)

        polygon = _obb_to_polygon(cx_geo, cy_geo, w_deg, h_deg, angle_deg)
        features.append({
            "type": "Feature",
            "id": f"wake-{i}",
            "geometry": {
                "type": "Polygon",
                "coordinates": [polygon],
            },
            "properties": {
                "confidence": round(det["confidence"], 3),
                "class": "ship_wake",
                "detection_id": f"WD-{i + 1:03d}",
                "description": f"Wake detection (conf: {det['confidence']:.0%})",
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


# Images known to produce good detections with fast_test_150 weights
GOOD_DEMO_IMAGES = [
    "1054.png",  # 4 detections
    "1048.png",  # 2 detections
    "1084.png",  # 2 detections
    "1117.png",  # 2 detections
    "1065.png",  # 2 detections
    "1025.png",  # 1 detection, high confidence
    "1053.png",  # 1 detection
    "1007.png",  # 1 detection
]


def get_available_images(limit: int = 20) -> list[dict]:
    """List available SAR test images that can be used for inference.

    Prioritises images known to produce good detections for demo purposes.
    """
    images = []
    # Good demo images first
    for name in GOOD_DEMO_IMAGES:
        p = DEFAULT_IMAGE_DIR / name
        if p.exists():
            images.append({"name": p.name, "path": str(p)})
    # Then the rest
    if DEFAULT_IMAGE_DIR.exists():
        seen = set(GOOD_DEMO_IMAGES)
        for p in sorted(DEFAULT_IMAGE_DIR.glob("*.png")):
            if p.name not in seen and len(images) < limit:
                images.append({"name": p.name, "path": str(p)})
    return images[:limit]


# ---------------------------------------------------------------------------
# Mock fallback (used when no image is provided)
# ---------------------------------------------------------------------------

def get_mock_wake_detections(center_lat: float = 33.73, center_lng: float = -118.26) -> dict:
    """Return mock wake-detection results as a GeoJSON FeatureCollection."""
    detections = [
        {"cx": center_lng + 0.012, "cy": center_lat - 0.008,
         "w": 0.008, "h": 0.002, "angle": 35.0, "confidence": 0.91,
         "vessel_hint": "Cargo vessel — V-wake pattern"},
        {"cx": center_lng - 0.015, "cy": center_lat + 0.005,
         "w": 0.006, "h": 0.0015, "angle": -20.0, "confidence": 0.78,
         "vessel_hint": "Unknown vessel — narrow wake"},
        {"cx": center_lng + 0.025, "cy": center_lat + 0.012,
         "w": 0.010, "h": 0.0025, "angle": 60.0, "confidence": 0.85,
         "vessel_hint": "Tanker — broad Kelvin wake"},
    ]
    features = []
    for i, d in enumerate(detections):
        polygon = _obb_to_polygon(d["cx"], d["cy"], d["w"], d["h"], d["angle"])
        features.append({
            "type": "Feature",
            "id": f"wake-{i}",
            "geometry": {"type": "Polygon", "coordinates": [polygon]},
            "properties": {
                "confidence": d["confidence"],
                "class": "ship_wake",
                "description": d["vessel_hint"],
                "detection_id": f"WD-{i + 1:03d}",
            },
        })
    return {"type": "FeatureCollection", "features": features}
