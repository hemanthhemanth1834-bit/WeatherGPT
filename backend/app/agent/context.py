"""Conversation-scoped context. No module-level mutable state."""

from dataclasses import dataclass, replace
from datetime import datetime, timezone


@dataclass(frozen=True)
class ConversationContext:
    """Small, explicit context carried between turns of one conversation."""

    location: str = ""
    state: str = ""
    persona: str = "general"
    language: str = "auto"
    last_intent: str = ""
    updated_at: str = ""

    def update(self, **changes) -> "ConversationContext":
        allowed = {
            "location",
            "state",
            "persona",
            "language",
            "last_intent",
        }
        clean = {key: value for key, value in changes.items() if key in allowed}
        clean["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        return replace(self, **clean)

    def as_dict(self) -> dict:
        return {
            "location": self.location,
            "state": self.state,
            "persona": self.persona,
            "language": self.language,
            "last_intent": self.last_intent,
            "updated_at": self.updated_at,
        }
