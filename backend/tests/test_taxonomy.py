"""Canonical data-kind taxonomy: mapping, fail-closed behaviour, contract."""

from fastapi.testclient import TestClient

from app.main import app
from app.services import provenance
from app.services.taxonomy import (
    DATA_KINDS,
    REQUIRED_PROVENANCE_FIELDS,
    canonical_kind,
    classify,
    contract_document,
)
from .weather_fixtures import make_test_weather

client = TestClient(app)


def test_reanalysis_beats_observed_when_both_labels_appear():
    assert (
        canonical_kind("OBSERVED / REANALYSIS (ERA5 via Open-Meteo Archive)")
        == "REANALYSIS"
    )
    assert canonical_kind("ERA5 reanalysis") == "REANALYSIS"
    assert canonical_kind("HISTORICAL normals") == "REANALYSIS"


def test_canonical_mapping_covers_every_supported_kind():
    assert canonical_kind("Official IMD district-nowcast RSS") == "OFFICIAL"
    assert canonical_kind("ENSEMBLE_FORECAST") == "FORECAST"
    assert canonical_kind("MODEL_FORECAST") == "FORECAST"
    assert canonical_kind("station observation") == "OBSERVED"
    assert canonical_kind("COMPUTED proxy (rain + elevation only)") == "COMPUTED"
    assert canonical_kind("ESTIMATED (textbook proxy)") == "ESTIMATED"
    assert canonical_kind("STATIC reference series") == "STATIC"
    assert canonical_kind("WRF simulation") == "MODEL"


def test_unknown_labels_fail_closed_as_static():
    result = classify("SOMETHING_UNRECOGNISED")
    assert result["data_kind"] == "STATIC"
    assert result["classified"] is False
    assert "SOMETHING_UNRECOGNISED" in result["data_type"]


def test_explicit_static_is_classified_but_never_live():
    result = classify("STATIC reference series")
    assert result["data_kind"] == "STATIC"
    assert result["classified"] is True
    assert result["freshness"] == "UNKNOWN"
    assert result["availability"] == "AVAILABLE"


def test_contract_document_shape():
    document = contract_document()
    assert document["version"] == "1.0"
    assert set(DATA_KINDS) <= set(document["kinds"])
    assert "OFFICIAL" in document["kinds"]
    assert set(REQUIRED_PROVENANCE_FIELDS) <= set(document["required_fields"])
    assert "data_kind" in document["required_fields"]
    assert document["rules"]["precedence"]
    assert set(document["methodology"]) >= set(DATA_KINDS)


def test_contract_endpoint_is_served():
    body = client.get("/api/data-contract").json()
    assert body["version"] == "1.0"
    assert "FORECAST" in body["kinds"]
    assert "limitations" in body["required_fields"]


def test_provenance_builders_emit_canonical_kind():
    weather = make_test_weather(16.51, 80.52, "Vijayawada", "Andhra Pradesh")
    built = provenance.build_weather_provenance(weather)
    assert built["data_kind"] == "ESTIMATED"
    assert built["units"] == "metric"
    assert built["methodology"]

    forecast_weather = weather.model_copy(
        update={"data_type": "MODEL_FORECAST", "data_source": "Open-Meteo"}
    )
    forecast = provenance.build_weather_provenance(forecast_weather)
    assert forecast["data_kind"] == "FORECAST"

    computed = provenance.computed_provenance("WeatherGPT risk engine")
    assert computed["data_kind"] == "COMPUTED"
    assert computed["units"] == "metric"

    official = provenance.official_provenance()
    assert official["data_kind"] == "OFFICIAL"
    assert official["units"] == "not_applicable"
