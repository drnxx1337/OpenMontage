"""Realtime audio must import cleanly when the optional websockets dep is absent.

The tool registry imports every tool module to discover it, so a top-level
``websockets`` import turned a missing optional package into a broken registry.
These tests simulate the absence rather than trusting the current venv.
"""

from __future__ import annotations

import builtins
import importlib

import pytest

import tools.audio._realtime_session as realtime_session
from tools.audio._realtime_session import WEBSOCKETS_REQUIREMENT


@pytest.fixture()
def websockets_unavailable(monkeypatch):
    """Make any import of websockets (or a submodule) raise ImportError."""
    real_import = builtins.__import__

    def blocked_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "websockets" or name.startswith("websockets."):
            raise ImportError(f"No module named {name!r}")
        return real_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", blocked_import)
    return blocked_import


def test_module_imports_without_websockets(websockets_unavailable):
    reloaded = importlib.reload(realtime_session)

    assert reloaded.RealtimeAudioSession is not None
    assert reloaded.WEBSOCKETS_REQUIREMENT == WEBSOCKETS_REQUIREMENT


def test_connect_raises_actionable_error_without_websockets(websockets_unavailable):
    with pytest.raises(RuntimeError) as excinfo:
        realtime_session._connect("wss://api.example.invalid/v1/realtime")

    assert str(excinfo.value) == WEBSOCKETS_REQUIREMENT
    assert 'pip install "websockets>=14.0"' in str(excinfo.value)
    # The original ImportError stays attached as the cause for debugging.
    assert isinstance(excinfo.value.__cause__, ImportError)
