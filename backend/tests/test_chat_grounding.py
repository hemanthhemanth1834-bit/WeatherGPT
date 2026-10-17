"""Regression tests for chat place-extraction grounding and forecast-horizon honesty."""
import datetime as _dt

from app.services.chat import extract_place_meta, horizon_note


def test_filler_words_do_not_become_places():
    place, explicit = extract_place_meta(
        "What is the source and update time of this answer?", "Pune")
    assert place == "Pune"
    assert explicit is False


def test_deictic_phrase_uses_fallback_without_explicit_flag():
    place, explicit = extract_place_meta("What about my selected location?", "Pune")
    assert place == "Pune"
    assert explicit is False


def test_deictic_phrase_without_fallback_defaults_to_delhi_not_explicit():
    place, explicit = extract_place_meta("Is it raining at my location?")
    assert place == "New Delhi"
    assert explicit is False


def test_explicit_city_is_flagged_explicit():
    place, explicit = extract_place_meta("Weather in Rajahmundry tomorrow?")
    assert place == "Rajahmundry"
    assert explicit is True


def test_unknown_city_name_is_still_explicit():
    place, explicit = extract_place_meta("weather in Atlantis Fairytale City")
    assert place == "Atlantis"
    assert explicit is True


def test_article_after_preposition_is_not_a_place():
    place, explicit = extract_place_meta("What is the AQI in the city?", "Pune")
    assert place == "Pune"
    assert explicit is False


def _month_name(month):
    return _dt.date(2026, month, 1).strftime("%B")


def test_horizon_note_for_far_future_month():
    ist = _dt.timezone(_dt.timedelta(hours=5, minutes=30))
    now = _dt.datetime.now(ist)
    far = (now.month + 2 - 1) % 12 + 1
    note = horizon_note(f"What about 15 {_month_name(far)} 2030?")
    assert "forecast horizon" in note


def test_horizon_note_absent_for_within_horizon_day():
    ist = _dt.timezone(_dt.timedelta(hours=5, minutes=30))
    now = _dt.datetime.now(ist)
    day = min(now.day + 3, 28)
    note = horizon_note(f"Rain on {day} {_month_name(now.month)}?")
    assert note == ""


def test_may_as_verb_does_not_trigger_horizon_note():
    assert horizon_note("it may rain tomorrow") == ""


def test_plain_forecast_question_has_no_horizon_note():
    assert horizon_note("Will it rain tomorrow?") == ""


# --- unresolved-location honesty -------------------------------------------
# A named place that cannot be geocoded used to be answered silently as the
# built-in default city (Pune), which reads as if that were the requested
# location. The note below must accompany that fallback.

from app.services.chat import unresolved_location_note  # noqa: E402


def test_unresolved_location_note_names_both_places():
    note = unresolved_location_note("Atlantis", "Pune")
    assert "could not resolve" in note
    assert "Atlantis" in note
    assert "Pune" in note


def test_unknown_place_is_reported_unresolved(monkeypatch):
    """An unresolvable name must be flagged so the answer can say which
    location the figures actually describe (previously it silently answered
    as the default city)."""
    from app.services import geo

    monkeypatch.setattr(geo, "_geocode_live", lambda query: None)
    _lat, _lon, name, state, resolved = geo.resolve("Krishnapatnam")
    assert resolved is False
    note = unresolved_location_note("Krishnapatnam", name)
    assert "could not resolve" in note
    assert "Krishnapatnam" in note and name in note
