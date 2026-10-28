import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok", "service": "skytrace-backend"}

@pytest.mark.asyncio
async def test_wavelengths_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/wavelengths")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 102
        assert data[0]["index"] == 0
        assert abs(data[0]["wavelength_um"] - 0.75) < 1e-3
        assert data[101]["index"] == 101
        assert abs(data[101]["wavelength_um"] - 5.0) < 1e-3

@pytest.mark.asyncio
async def test_observations_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/observations?ra=83.82&dec=-5.39&radius=0.2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        assert data[0]["ra"] == 83.82
        assert data[0]["dec"] == -5.39
        assert data[0]["data_release"] == "qr3"

@pytest.mark.asyncio
async def test_compare_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        obs_a = "spherex_qr3_83.82_-5.39_ep1_b50"
        obs_b = "spherex_qr3_83.82_-5.39_ep2_b50"
        resp = await client.get(f"/api/v1/compare?obs_a={obs_a}&obs_b={obs_b}&band=50")
        assert resp.status_code == 200
        data = resp.json()
        assert "image_a_b64" in data
        assert "image_b_b64" in data
        assert "difference_b64" in data
        assert len(data["image_a_b64"]) > 500
        assert len(data["image_b_b64"]) > 500
        assert len(data["difference_b64"]) > 500
        assert "candidates" in data
        assert len(data["candidates"]) > 0
        cand = data["candidates"][0]
        assert "snr_change" in cand
        assert "confidence_score" in cand

@pytest.mark.asyncio
async def test_candidate_evidence_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/candidates/test_cand_123/evidence")
        assert resp.status_code == 200
        data = resp.json()
        assert data["candidate_id"] == "test_cand_123"
        assert "narrative" in data
        assert len(data["measurements"]) >= 3
        assert len(data["caveats"]) >= 2
        assert len(data["irsa_links"]) >= 2
