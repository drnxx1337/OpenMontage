"""Pipeline-scope resume must agree between the reader and the writer.

A pipeline switch must not reuse another pipeline's completed work; a legacy
(pre-scoping) checkpoint — recorded pipeline_type ``"unknown"`` or empty — is
the only exception, and the schema still requires the key to be present.
"""

import pytest

from lib.checkpoint import (
    CheckpointValidationError,
    get_completed_stages,
    get_next_stage,
    read_checkpoint,
    write_checkpoint,
)
from tests.contracts.test_phase0_contracts import sample_artifact


def test_pipeline_switch_restarts_shared_stage(tmp_path):
    # Both real manifests begin with research, but its completion belongs to
    # the old cinematic run, not the new framework-smoke run.
    write_checkpoint(
        tmp_path, "film", "research", "completed",
        {"research_brief": sample_artifact("research_brief")},
        pipeline_type="cinematic", human_approved=True,
    )

    assert get_completed_stages(tmp_path, "film", "framework-smoke") == []
    assert get_next_stage(tmp_path, "film", "framework-smoke") == "research"

    # The writer applies the same rule: a checkpoint that names another
    # pipeline is not a completed predecessor, so the advance is refused.
    with pytest.raises(CheckpointValidationError, match="PREREQUISITE VIOLATION"):
        write_checkpoint(
            tmp_path, "film", "script", "completed",
            {"script": sample_artifact("script")},
            pipeline_type="framework-smoke", human_approved=True,
        )


def test_matching_pipeline_completion_is_retained(tmp_path):
    write_checkpoint(
        tmp_path, "film", "research", "completed",
        {"research_brief": sample_artifact("research_brief")},
        pipeline_type="framework-smoke", human_approved=True,
    )

    assert get_completed_stages(tmp_path, "film", "framework-smoke") == ["research"]
    assert get_next_stage(tmp_path, "film", "framework-smoke") == "script"


def test_unscoped_legacy_resume_still_accepts_completion(tmp_path):
    write_checkpoint(
        tmp_path, "film", "research", "completed",
        {"research_brief": sample_artifact("research_brief")},
        human_approved=True,
    )

    assert get_completed_stages(tmp_path, "film") == ["research"]
    assert get_next_stage(tmp_path, "film") == "proposal"


def test_legacy_unknown_pipeline_type_counts_under_scope(tmp_path):
    # Pre-scoping checkpoints record pipeline_type "unknown"; they belong to no
    # other pipeline, so a scoped resume must not re-run their stages.
    write_checkpoint(
        tmp_path, "film", "research", "completed",
        {"research_brief": sample_artifact("research_brief")},
        human_approved=True,
    )

    legacy = read_checkpoint(tmp_path, "film", "research")
    assert legacy is not None
    assert legacy["pipeline_type"] == "unknown"
    assert get_completed_stages(tmp_path, "film", "framework-smoke") == ["research"]
    assert get_next_stage(tmp_path, "film", "framework-smoke") == "script"


def test_legacy_predecessor_does_not_block_scoped_advance(tmp_path):
    # The reader accepts a legacy predecessor as completed, so the writer must
    # accept it too — otherwise a resumable project can never advance.
    write_checkpoint(
        tmp_path, "film", "research", "completed",
        {"research_brief": sample_artifact("research_brief")},
        human_approved=True,
    )

    assert get_next_stage(tmp_path, "film", "cinematic") == "proposal"

    write_checkpoint(
        tmp_path, "film", "proposal", "completed",
        {"proposal_packet": sample_artifact("proposal_packet")},
        pipeline_type="cinematic", human_approved=True,
    )

    assert get_completed_stages(tmp_path, "film", "cinematic") == ["research", "proposal"]
    assert get_next_stage(tmp_path, "film", "cinematic") == "script"
