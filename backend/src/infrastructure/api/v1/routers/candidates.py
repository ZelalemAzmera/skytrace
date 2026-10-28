from fastapi import APIRouter, Depends, Query
from ..schemas import CandidateResponse, EvidenceResponse
from src.infrastructure.api.dependencies import get_search_candidates_uc, get_evidence_uc

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])

@router.get("/{candidate_id}/evidence", response_model=EvidenceResponse)
async def get_candidate_evidence(
    candidate_id: str,
    use_case=Depends(get_evidence_uc),
):
    evidence = await use_case.execute(candidate_id=candidate_id)
    return EvidenceResponse(
        candidate_id=evidence.candidate_id,
        narrative=evidence.narrative,
        measurements=[m.__dict__ for m in evidence.measurements],
        caveats=evidence.caveats,
        irsa_links=evidence.irsa_links,
        quality_flags=evidence.quality_flags,
    )
