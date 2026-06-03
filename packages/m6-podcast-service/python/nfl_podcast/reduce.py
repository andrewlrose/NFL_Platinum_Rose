"""Re-exports the dedup/preference reducer from quality_gate.

The reducer and the gate share the confirmation-phrase logic, so they live
together; this shim preserves the spec's module layout for callers that
``from nfl_podcast.reduce import reduce_picks``.
"""

from .quality_gate import CONFIRMATION_PHRASES, reduce_picks

__all__ = ["reduce_picks", "CONFIRMATION_PHRASES"]
