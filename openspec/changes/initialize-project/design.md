## Context

The repository already contains the application source, but local setup depends on several moving parts: a Node.js runtime, the `opencli` command entrypoint, browser bridge extension setup, and daemon connectivity validation. On Windows in particular, contributors can lose time to path issues, browser extension loading errors, and daemon/extension connectivity drift. We need a predictable initialization design that works from a fresh checkout and clearly separates bootstrap, browser setup, and validation.

## Goals / Non-Goals

**Goals:**
- Define a one-step local bootstrap entrypoint for contributors starting from a fresh checkout.
- Ensure browser-backed commands have a documented extension setup and connectivity check.
- Make verification explicit so contributors know whether the project is ready before they implement features.

**Non-Goals:**
- Replace the existing application architecture or packaging model.
- Introduce a production installer for end users.
- Solve every platform-specific browser automation edge case in this change.

## Decisions

### Use a repository-local bootstrap flow
Use repository-local scripts and directories for runtime setup and command entrypoints instead of assuming globally installed dependencies.

Rationale:
- Keeps initialization reproducible across machines.
- Avoids depending on external package managers that may not be installed.
- Aligns with the current project state, which already works well with local runtime placement.

Alternatives considered:
- Require global Node/OpenCLI installation.
  Rejected because it introduces machine-specific drift and harder support.
- Rely only on README instructions.
  Rejected because setup remains manual and error-prone.

### Separate bootstrap from browser bridge setup
Treat core bootstrap and browser bridge setup as distinct capabilities under the same change.

Rationale:
- Core runtime preparation and browser automation setup fail for different reasons.
- Contributors can complete basic CLI setup before handling browser-specific requirements.
- Validation output can be more targeted and actionable.

Alternatives considered:
- Collapse everything into one monolithic initialization requirement.
  Rejected because it hides distinct failure modes and makes tasks less clear.

### Standardize readiness checks around existing health commands
Use explicit post-bootstrap validation, including daemon/extension connectivity checks for browser-backed workflows, rather than inventing a separate health system.

Rationale:
- Reuses project-native commands and behaviors.
- Keeps documentation and automation aligned with actual runtime checks.
- Reduces duplicate verification logic.

Alternatives considered:
- Add a separate custom verifier script only for OpenSpec compliance.
  Rejected because it would duplicate existing project checks and drift over time.

## Risks / Trade-offs

- [Windows-specific environment behavior] -> Keep bootstrap repository-local and prefer wrapper scripts over fragile global PATH assumptions.
- [Browser extension connectivity can drop after setup] -> Include explicit live connectivity validation and remediation steps in the documented flow.
- [Bootstrap can grow into a grab bag of unrelated setup steps] -> Limit this change to runtime preparation, browser bridge setup, and readiness verification.
- [Local runtime copies may require periodic refresh] -> Document their role as bootstrap dependencies and keep validation tied to the actual installed versions.

## Migration Plan

1. Define the initialization requirements and browser bridge setup requirements in specs.
2. Implement or refine the bootstrap entrypoint and validation flow to satisfy those requirements.
3. Update onboarding documentation to reference the supported bootstrap path.
4. Verify a fresh local checkout can reach a healthy ready state using the documented commands.
5. If the bootstrap flow regresses, fall back to the previous manual setup path while preserving the repository-local scripts for debugging.

## Open Questions

- Should the bootstrap flow explicitly support non-Windows platforms in this change, or document Windows-first support and expand later?
- Should browser extension packaging be part of bootstrap output, or remain a separately documented manual step?
- Do we want one high-level bootstrap command for contributors only, or also a CI-friendly initialization command in the same flow?
