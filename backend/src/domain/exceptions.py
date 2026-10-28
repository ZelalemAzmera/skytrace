"""Domain exceptions for SkyTrace."""

class SkyTraceError(Exception):
    """Base domain exception."""
    pass

class NoDataError(SkyTraceError):
    """Raised when no observations are found."""
    pass

class IRSAError(SkyTraceError):
    """Raised when external IRSA service fails."""
    pass

class ArtifactWarning(SkyTraceError):
    """Raised when candidate is suspected to be an instrument artifact."""
    pass

class CoordinateError(SkyTraceError):
    """Raised when coordinate validation fails."""
    pass
