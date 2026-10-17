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


def test_unknown_place_is_not_substring_matched_to_gazetteer(monkeypatch):
    """Regression: unknown names must not silently resolve to a gazetteer
    entry contained inside them ("krishnapatnam" contains "patna").

    The live geocoder is stubbed out so the assertion is deterministic and
    offline; with no gazetteer match left, the documented default applies.
    """
    monkeypatch.setattr(geo, "_geocode_live", lambda query: None)
    lat, lon, name, state = geo.geocode("Krishnapatnam")
    assert name == "Pune", f"unknown place was resolved to {name!r}"
    assert (lat, lon) == (18.5204, 73.8567)


def test_substring_neighbour_still_resolves_when_real(monkeypatch):
    """The real city inside that substring (Visakhapatnam) must still hit."""
    monkeypatch.setattr(geo, "_geocode_live", lambda query: None)
    lat, lon, name, state = geo.geocode("Visakhapatnam")
    assert name == "Visakhapatnam"
    assert abs(lat - 17.6868) < 0.001
    assert abs(lon - 83.2185) < 0.001


def test_multiword_gazetteer_still_matches(monkeypatch):
    """Token matching must not break legitimate multi-word gazetteer keys."""
    monkeypatch.setattr(geo, "_geocode_live", lambda query: None)
    lat, lon, name, state = geo.geocode("  NAVI-MUMBAI ")
    assert name == "Navi Mumbai"
    assert state == "Maharashtra"
    assert abs(lat - 19.0330) < 0.001


def test_unknown_place_never_invents_state(monkeypatch):
    """A name that is not a place at all must not claim another state."""
    monkeypatch.setattr(geo, "_geocode_live", lambda query: None)
    _lat, _lon, name, state = geo.geocode("Bellary Road")
    assert name != "Bellary", "unknown compound name was substring-matched"


def test_resolve_reports_real_provenance(monkeypatch):
    """resolve() must distinguish a real hit from the silent default."""
    monkeypatch.setattr(geo, "_geocode_live", lambda query: None)
    _lat, _lon, name, state, resolved = geo.resolve("Krishnapatnam")
    assert resolved is False, "unresolvable place must not report as resolved"
    assert name == "Pune"

    _lat, _lon, name, state, resolved = geo.resolve("Visakhapatnam")
    assert resolved is True
    assert name == "Visakhapatnam"


def test_resolve_uses_live_geocoder_when_gazetteer_misses(monkeypatch):
    """A live hit is a real resolution and must be reported as such."""
    monkeypatch.setattr(
        geo, "_geocode_live",
        lambda query: (12.34, 56.78, "Somewhere", "Some State"),
    )
    lat, lon, name, state, resolved = geo.resolve("Somewhere")
    assert (lat, lon, name, state) == (12.34, 56.78, "Somewhere", "Some State")
    assert resolved is True


def test_geocode_signature_unchanged(monkeypatch):
    """Existing 4-tuple callers must keep working."""
    monkeypatch.setattr(geo, "_geocode_live", lambda query: None)
    result = geo.geocode("Vijayawada")
    assert len(result) == 4
    lat, lon, name, state = result
    assert name == "Vijayawada" and state == "Andhra Pradesh"
