"""Unit tests for location resolution (offline paths only)."""
from app.services import geo


def test_gazetteer_hit():
    lat, lon, name, state = geo.geocode("Vijayawada")
    assert name == "Vijayawada"
    assert state == "Andhra Pradesh"
    assert abs(lat - 16.5062) < 0.001
    assert abs(lon - 80.6480) < 0.001


def test_case_and_punctuation_tolerant():
    lat, lon, name, state = geo.geocode("  NEW-DELHI ")
    assert name == "New Delhi"
    assert state == "Delhi"


def test_empty_query_falls_back_to_default():
    lat, lon, name, state = geo.geocode("")
    assert (name, state) == ("Pune", "Maharashtra")


def test_autocomplete_prefix():
    results = geo.autocomplete("vij", limit=5)
    names = [r["name"] for r in results]
    assert "Vijayawada" in names
    assert all("lat" in r and "lon" in r and "state" in r for r in results)


def test_autocomplete_short_query_returns_defaults():
    results = geo.autocomplete("", limit=4)
    assert len(results) == 4


def test_metro_areas_known_and_unknown():
    assert any(a["name"] == "Hinjawadi" for a in geo.metro_areas("pune"))
    assert len(geo.metro_areas("atlantis")) > 0
