from typing import Protocol
from ...domain.entities.evidence import ComparisonResult, Evidence
from ...domain.entities.observation import Observation
from ...domain.entities.candidate import Candidate

class IQuerySkyRegion(Protocol):
    async def execute(self, ra: float, dec: float, radius_deg: float, band: int | None = None) -> list[Observation]: ...

class ICompareObservations(Protocol):
    async def execute(self, obs_a_id: str, obs_b_id: str, band: int) -> ComparisonResult: ...

class ISearchCandidates(Protocol):
    async def execute(self, comparison_id: str) -> list[Candidate]: ...

class IGenerateEvidence(Protocol):
    async def execute(self, candidate_id: str) -> Evidence: ...
