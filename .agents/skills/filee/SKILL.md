---
name: filee
description: File handling, parsing, and format conversion guidelines for astronomical and scientific files (FITS, HDF5, GeoTIFF, WCS headers, PNG/JPEG tiles, JSON payloads). Use when processing file uploads, downloads, streaming chunks, or converting FITS arrays to web-ready image formats.
---

# Filee — Scientific File Handling & Transformation

## 1. FITS File Handling (astropy.io.fits)
- Always use memory-efficient streaming: `fits.open(..., memmap=True)` for large cube files.
- Inspect HDU headers safely: handle missing WCS keywords (`CRVAL`, `CDELT`, `CTYPE`) with graceful fallbacks.
- Extract Primary and Extension HDUs cleanly.

## 2. Array-to-Image Pipeline
- Normalization: ZScale or Asinh stretching (`astropy.visualization.ZScaleInterval()`) to avoid washed-out or completely dark astronomical images.
- Export to WebP/PNG tiles with correct 8-bit quantization.

## 3. Temporary & Scratch Files
- Use temporary directories with context managers (`tempfile.TemporaryDirectory()`) to prevent storage leaks.
