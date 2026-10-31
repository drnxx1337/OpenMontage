"""Regression tests for provider scoring tokenization."""

from __future__ import annotations

import logging

from lib.scoring import UNKNOWN_COST_EFFICIENCY, _tokenize_text, score_provider
from tools.base_tool import ToolStatus
from tools.provider_pricing import PriceQuoteRequired


class _FakeVideoTool:
    name = "fake-video"

    def get_info(self) -> dict[str, object]:
        return {
            "name": "fake-video",
            "provider": "fake",
            "best_for": ["cinematic video"],
            "supports": {
                "native_audio": True,
                "multi_shot": True,
                "camera_direction": True,
                "lip_sync": True,
                "cinematic_quality": True,
            },
            "stability": "production",
            "runtime": "api",
        }

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE

    def estimate_cost(self, inputs: dict[str, object]) -> float:
        return 0.0


def test_tokenize_text_strips_trailing_punctuation() -> None:
    assert _tokenize_text("cinematic.") == ["cinematic"]
    assert _tokenize_text("v1.5.") == ["v1.5"]
    assert _tokenize_text("gpt-4.1") == ["gpt-4.1"]


def test_cinematic_bonus_ignores_adjacent_punctuation() -> None:
    tool = _FakeVideoTool()
    plain = score_provider(tool, {"asset_type": "video", "intent": "make it cinematic and fast"})
    punctuated = score_provider(tool, {"asset_type": "video", "intent": "make it cinematic, and fast"})

    assert punctuated.task_fit == plain.task_fit
    assert punctuated.output_quality == plain.output_quality


def test_estimate_cost_failure_scores_unknown_cost_and_warns(caplog) -> None:
    class _UnpricedTool(_FakeVideoTool):
        def estimate_cost(self, inputs: dict[str, object]) -> float:
            raise RuntimeError("pricing service unavailable")

    tool = _UnpricedTool()
    with caplog.at_level(logging.WARNING, logger="lib.scoring"):
        score = score_provider(
            tool, {"asset_type": "video", "intent": "make it cinematic"}
        )

    # Below the 20-50%-of-budget band (0.5), above over-budget (0.0/0.1).
    assert score.cost_efficiency == UNKNOWN_COST_EFFICIENCY == 0.3
    assert "fake-video" in caplog.text
    assert "pricing service unavailable" in caplog.text


def test_price_quote_required_scores_unknown_cost_without_warning(caplog) -> None:
    class _QuotedTool(_FakeVideoTool):
        def estimate_cost(self, inputs: dict[str, object]) -> float:
            raise PriceQuoteRequired("requires an account-specific quote")

    with caplog.at_level(logging.WARNING, logger="lib.scoring"):
        score = score_provider(
            _QuotedTool(), {"asset_type": "video", "intent": "make it cinematic"}
        )

    # A designed control-flow signal is not a failure: same score, no noise.
    assert score.cost_efficiency == UNKNOWN_COST_EFFICIENCY == 0.3
    assert caplog.text == ""


def test_free_tool_keeps_full_cost_efficiency(caplog) -> None:
    with caplog.at_level(logging.WARNING, logger="lib.scoring"):
        score = score_provider(
            _FakeVideoTool(), {"asset_type": "video", "intent": "make it cinematic"}
        )

    assert score.cost_efficiency == 1.0
    assert caplog.text == ""
