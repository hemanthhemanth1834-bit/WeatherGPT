"""Validate and execute registered tools. No arbitrary dispatch or payloads."""

import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from typing import Any, Dict, Optional

from pydantic import BaseModel, ValidationError

from .tool_registry import get_tool


class ToolResult(BaseModel):
    tool: str
    status: str
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration_ms: int = 0
    source: str = ""
    timeout_seconds: Optional[float] = None


def _error(
    name: str,
    status: str,
    message: str,
    started: float,
    source: str = "",
    timeout: Optional[float] = None,
) -> ToolResult:
    return ToolResult(
        tool=name,
        status=status,
        ok=False,
        error=message,
        duration_ms=round((time.perf_counter() - started) * 1000),
        source=source,
        timeout_seconds=timeout,
    )


def execute_tool(name: str, payload: Optional[Dict[str, Any]] = None) -> ToolResult:
    """Run one allowlisted tool with schema validation and a bounded timeout."""
    started = time.perf_counter()
    spec = get_tool(name)
    if spec is None:
        return _error(name, "UNKNOWN_TOOL", "tool is not allowlisted", started)
    try:
        validated = spec.input_model.model_validate(payload or {})
    except ValidationError as exc:
        # Validation messages name fields, never secret values.
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(part) for part in first.get("loc", ())) or "input"
        return _error(
            name,
            "INVALID_INPUT",
            f"invalid field: {field}",
            started,
            spec.source,
            spec.timeout_seconds,
        )
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(spec.handler, validated)
    try:
        data = future.result(timeout=spec.timeout_seconds)
    except FutureTimeout:
        future.cancel()
        executor.shutdown(wait=False, cancel_futures=True)
        return _error(
            name,
            "TIMEOUT",
            "tool exceeded its time budget",
            started,
            spec.source,
            spec.timeout_seconds,
        )
    except Exception as exc:
        executor.shutdown(wait=False)
        return _error(
            name,
            "ERROR",
            type(exc).__name__,
            started,
            spec.source,
            spec.timeout_seconds,
        )
    executor.shutdown(wait=False)
    return ToolResult(
        tool=name,
        status="OK",
        ok=True,
        data=data if isinstance(data, dict) else {"result": data},
        duration_ms=round((time.perf_counter() - started) * 1000),
        source=spec.source,
        timeout_seconds=spec.timeout_seconds,
    )


def trace_entry(result: ToolResult) -> Dict[str, Any]:
    """Secret-free trace row suitable for ChatResponse.tool_trace."""
    return {
        "tool": result.tool,
        "status": result.status,
        "duration_ms": result.duration_ms,
        "source": result.source,
    }
