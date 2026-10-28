from ..ports.outbound import ICandidateRepository
from ...domain.entities.candidate import Candidate

class SearchCandidatesUC:
    def __init__(self, candidate_repo: ICandidateRepository | None = None) -> None:
        self._repo = candidate_repo

    async def execute(self, comparison_id: str) -> list[Candidate]:
        if self._repo:
            candidates = await self._repo.get_by_comparison(comparison_id)
            return sorted(candidates, key=lambda c: c.confidence_score, reverse=True)
        return []
