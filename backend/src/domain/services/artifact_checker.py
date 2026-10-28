"""Artifact rejection service for SPHEREx difference images."""
import numpy as np

class ArtifactChecker:
    @staticmethod
    def is_artifact(
        pixel_x: float,
        pixel_y: float,
        image_shape: tuple[int, int],
        fwhm_pixels: float,
        flags_value: int = 0,
    ) -> tuple[bool, float, list[str]]:
        """Evaluate probability of source being an instrument artifact.
        
        Returns:
            (is_likely_artifact: bool, artifact_probability: float, reasons: list[str])
        """
        h, w = image_shape
        dist_x = min(pixel_x, w - 1 - pixel_x)
        dist_y = min(pixel_y, h - 1 - pixel_y)
        edge_dist = min(dist_x, dist_y)

        prob = 0.0
        reasons = []

        # 1. Edge proximity
        if edge_dist < 10.0:
            prob += 0.50
            reasons.append(f"Very close to sensor edge ({edge_dist:.1f} px)")
        elif edge_dist < 20.0:
            prob += 0.25
            reasons.append(f"Near sensor edge ({edge_dist:.1f} px)")

        # 2. Sharpness (Cosmic ray vs real star)
        if fwhm_pixels < 1.1:
            prob += 0.45
            reasons.append(f"Excessive sharpness (FWHM = {fwhm_pixels:.2f} px) characteristic of cosmic ray")
        elif fwhm_pixels > 4.5:
            prob += 0.35
            reasons.append(f"Diffused profile (FWHM = {fwhm_pixels:.2f} px) characteristic of optical ghost or smudge")

        # 3. Bad pixel flag mask
        if flags_value != 0:
            prob += 0.40
            reasons.append(f"Flag mask non-zero (flags={hex(flags_value)})")

        prob = min(prob, 1.0)
        return (prob >= 0.5, round(prob, 3), reasons)
