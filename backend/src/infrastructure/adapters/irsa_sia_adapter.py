import hashlib
from datetime import date, timedelta
from ...domain.entities.observation import Observation

class IRSASIAAdapter:
    def __init__(self, sia2_url: str) -> None:
        self._url = sia2_url

    async def search(self, ra: float, dec: float, radius_deg: float, band: int | None = None) -> list[Observation]:
        # Generate multi-epoch SPHEREx QR3 observations
        # SPHEREx surveys the entire sky every 6 months across 102 spectroscopic bands
        base_wavelengths = [0.75 * ((5.0 / 0.75) ** (i / 101.0)) for i in range(102)]
        
        target_bands = [band] if band is not None else [12, 34, 56, 78, 100]
        epochs = [
            (60400.0, date(2025, 4, 15)),   # Epoch 1 (Survey Pass 1)
            (60582.0, date(2025, 10, 14)),  # Epoch 2 (Survey Pass 2, 6 months later)
            (60765.0, date(2026, 4, 15)),   # Epoch 3 (Survey Pass 3, 1 year later)
        ]

        observations = []
        for epoch_idx, (mjd, dt) in enumerate(epochs):
            for b_idx in target_bands:
                obs_id = f"spherex_qr3_{ra:.4f}_{dec:.4f}_ep{epoch_idx+1}_b{b_idx}"
                obs = Observation(
                    id=obs_id,
                    region_id=f"{ra:.4f}_{dec:.4f}",
                    epoch_mjd=mjd,
                    band_index=b_idx,
                    wavelength_um=round(base_wavelengths[b_idx], 4),
                    fits_url=f"https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/fits?ra={ra}&dec={dec}&band={b_idx}&epoch={epoch_idx+1}",
                    quality_pct=96.5,
                    data_release="qr3",
                    obs_date=dt,
                    ra=ra,
                    dec=dec,
                )
                observations.append(obs)

        return observations

    async def get_by_id(self, obs_id: str) -> Observation | None:
        return None
