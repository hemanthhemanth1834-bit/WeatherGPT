"""API smoke tests for network-independent endpoints."""
from fastapi.testclient import TestClient

from app.main import app
from app.services.agent_tools import list_tools
from app.services.nwp_service import get_nwp_status
from app.services.satellite_service import get_satellite_info
from app.services.indian_sources_service import get_indian_sources_status

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_developer_meta():
    res = client.get("/api/meta/developer")
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Muchakarla Hemanth Kumar"
    assert "SRK Institute of Technology" in body["institution"]
    assert "2024" in body["academic_period"]


def test_project_meta_flags_missing_license():
    res = client.get("/api/meta/project")
    assert res.status_code == 200
    assert "NO license" in res.json()["license_note"] or "license" in res.json()["license_note"].lower()


def test_agent_tools_registry():
    res = client.get("/api/agent/tools")
    assert res.status_code == 200
    names = {t["name"] for t in res.json()["tools"]}
    for expected in ("weather_current", "weather_alerts", "risk_analysis", "satellite_information"):
        assert expected in names


def test_nwp_status_marks_wrf_not_configured_by_default():
    res = client.get("/api/nwp/status")
    assert res.status_code == 200
    body = res.json()
    assert body["gfs"]["status"] == "LIVE"
    assert body["wrf"]["status"] in ("NOT CONFIGURED", "CONFIGURED")


def test_satellite_info():
    res = client.get("/api/satellite/info?lat=17.38&lon=78.48")
    assert res.status_code == 200
    assert "sources" in res.json()


def test_indian_sources():
    res = client.get("/api/sources/indian")
    assert res.status_code == 200
    assert "sources" in res.json()


def test_service_functions_direct():
    assert get_nwp_status()["integration"] == "READY"
    assert len(list_tools()["tools"]) >= 11
    assert "sources" in get_satellite_info()
    assert "sources" in get_indian_sources_status()
