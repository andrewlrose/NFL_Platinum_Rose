"""M6 podcast pipeline — Python sub-agents.

Modules:
    chunk           token-budget transcript chunker
    prompts         system prompt + few-shot examples
    schema          JSON schema for extracted picks
    ollama_client   thin HTTP wrapper around the local Ollama API
    reduce          dedup + confirmation-phrase preference
    quality_gate    per-pick + per-episode scoring; cloud-fallback decision
    extract         CLI entry point: transcript path -> picks JSON

See spec §3 Phase 4.
"""
