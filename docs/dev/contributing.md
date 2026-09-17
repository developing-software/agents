# Contributing

## Principles

- prefer the simplest solution that matches current patterns
- avoid introducing new abstractions without a concrete need
- keep provider-aware behavior generic at the tag and interface layers
- keep repository-scoped behavior constrained to the correct `source` and `sourceId`

## Expectations

- update docs when user-visible or architecture-level behavior changes
- add or update tests when semantics change
- regenerate spec/SDK artifacts when API documentation changes
- avoid duplicating guidance across root docs

## Documentation Split

- `docs/user/*` is for platform users and operators
- `docs/dev/*` is for maintainers and contributors
- `README.md` is the landing page only
