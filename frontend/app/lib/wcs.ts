export interface WCSHeader {
  CRPIX1: number;
  CRPIX2: number;
  CRVAL1: number;
  CRVAL2: number;
  CD1_1: number;
  CD1_2: number;
  CD2_1: number;
  CD2_2: number;
}

/**
 * World Coordinate System (WCS) transformation engine for astronomical TAN projection.
 * Maps between pixel coordinates [px, py] and sky coordinates [RA, Dec] in degrees.
 */
export class WCSTransform {
  private header: WCSHeader;

  constructor(header?: Partial<WCSHeader>) {
    // Default SPHEREx 6.2 arcsec/pixel calibration for a 512x512 cutout centered at (83.8221, -5.3911)
    const scaleDeg = 6.2 / 3600; // ~0.001722 deg/pixel
    this.header = {
      CRPIX1: header?.CRPIX1 ?? 256.0,
      CRPIX2: header?.CRPIX2 ?? 256.0,
      CRVAL1: header?.CRVAL1 ?? 83.8221,
      CRVAL2: header?.CRVAL2 ?? -5.3911,
      CD1_1: header?.CD1_1 ?? -scaleDeg,
      CD1_2: header?.CD1_2 ?? 0.0,
      CD2_1: header?.CD2_1 ?? 0.0,
      CD2_2: header?.CD2_2 ?? scaleDeg,
    };
  }

  /**
   * Converts celestial coordinates (RA, Dec in degrees) to pixel coordinates [x, y].
   */
  sky2pix(raDeg: number, decDeg: number): [number, number] {
    const cosD = Math.cos((this.header.CRVAL2 * Math.PI) / 180);
    const dRA = (raDeg - this.header.CRVAL1) * cosD;
    const dDec = decDeg - this.header.CRVAL2;

    const { CD1_1, CD1_2, CD2_1, CD2_2, CRPIX1, CRPIX2 } = this.header;
    const det = CD1_1 * CD2_2 - CD1_2 * CD2_1;

    if (Math.abs(det) < 1e-12) {
      return [CRPIX1 - 1, CRPIX2 - 1];
    }

    const x = (CD2_2 * dRA - CD1_2 * dDec) / det + (CRPIX1 - 1);
    const y = (CD1_1 * dDec - CD2_1 * dRA) / det + (CRPIX2 - 1);

    return [x, y];
  }

  /**
   * Converts pixel coordinates [px, py] to celestial coordinates [RA, Dec in degrees].
   */
  pix2sky(px: number, py: number): [number, number] {
    const { CD1_1, CD1_2, CD2_1, CD2_2, CRPIX1, CRPIX2, CRVAL1, CRVAL2 } = this.header;
    const dx = px - (CRPIX1 - 1);
    const dy = py - (CRPIX2 - 1);
    const cosD = Math.cos((CRVAL2 * Math.PI) / 180);

    const raDeg = CRVAL1 + (CD1_1 * dx + CD1_2 * dy) / (cosD || 1);
    const decDeg = CRVAL2 + (CD2_1 * dx + CD2_2 * dy);

    let normalizedRA = raDeg % 360;
    if (normalizedRA < 0) normalizedRA += 360;

    return [normalizedRA, decDeg];
  }

  getHeader(): WCSHeader {
    return { ...this.header };
  }
}
