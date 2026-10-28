from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, Text, JSON, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class ObservationModel(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    region_id: Mapped[str] = mapped_column(String, index=True)
    epoch_mjd: Mapped[float] = mapped_column(Float)
    band_index: Mapped[int] = mapped_column(Integer)
    wavelength_um: Mapped[float] = mapped_column(Float)
    fits_url: Mapped[str] = mapped_column(String)
    quality_pct: Mapped[float] = mapped_column(Float)
    data_release: Mapped[str] = mapped_column(String, default="qr3")
    ra: Mapped[float] = mapped_column(Float, index=True)
    dec: Mapped[float] = mapped_column(Float, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class CandidateModel(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    comparison_id: Mapped[str] = mapped_column(String, index=True)
    ra: Mapped[float] = mapped_column(Float)
    dec: Mapped[float] = mapped_column(Float)
    pixel_x: Mapped[float] = mapped_column(Float)
    pixel_y: Mapped[float] = mapped_column(Float)
    snr_change: Mapped[float] = mapped_column(Float)
    delta_flux: Mapped[float] = mapped_column(Float)
    delta_flux_sigma: Mapped[float] = mapped_column(Float)
    motion_arcsec: Mapped[float] = mapped_column(Float, default=0.0)
    artifact_probability: Mapped[float] = mapped_column(Float)
    confidence_score: Mapped[float] = mapped_column(Float, index=True)
    most_match: Mapped[bool] = mapped_column(Boolean, default=False)
    most_object_name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
