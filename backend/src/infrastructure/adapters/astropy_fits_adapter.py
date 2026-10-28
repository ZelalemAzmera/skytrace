import io
import warnings
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS, FITSFixedWarning
from ...domain.entities.fits_image import FITSImage

class AstropyFITSAdapter:
    def parse(self, fits_bytes: bytes, obs_id: str = "") -> FITSImage:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", FITSFixedWarning)
            with fits.open(io.BytesIO(fits_bytes)) as hdul:
                # Find image, flags, variance HDUs
                primary_header = hdul[0].header
                if len(hdul) > 1 and hdul[1].data is not None:
                    image_hdu = hdul[1]
                    flags_hdu = hdul[2] if len(hdul) > 2 else None
                    var_hdu = hdul[3] if len(hdul) > 3 else None
                else:
                    image_hdu = hdul[0]
                    flags_hdu = None
                    var_hdu = None

                data = image_hdu.data.astype(np.float32) if image_hdu.data is not None else np.zeros((100, 100), dtype=np.float32)
                flags = flags_hdu.data.astype(np.int16) if flags_hdu and flags_hdu.data is not None else np.zeros_like(data, dtype=np.int16)
                variance = var_hdu.data.astype(np.float32) if var_hdu and var_hdu.data is not None else np.ones_like(data, dtype=np.float32)

                try:
                    wcs = WCS(image_hdu.header)
                except Exception:
                    wcs = WCS(naxis=2)

                bad_mask = flags != 0
                data_masked = np.where(bad_mask, np.nan, data)
                quality_pct = 100.0 * float((~bad_mask).sum()) / max(bad_mask.size, 1)

                return FITSImage(
                    data=data_masked,
                    variance=variance,
                    flags=flags,
                    wcs=wcs,
                    epoch_mjd=float(primary_header.get("MJD-OBS", 60000.0)),
                    wavelength_um=float(primary_header.get("WAVELNTH", 1.0)),
                    band_index=int(primary_header.get("BANDINDX", 0)),
                    obs_id=obs_id,
                    quality_pct=float(quality_pct),
                )
