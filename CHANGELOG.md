# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.4] - 2026-09-29

### Changed

- AIRP Renderer opens `*.airp.json` faster in VS Code / Cursor

## [1.1.3] - 2026-09-24

### Added

- Blocks catalog in the project and AIRP Renderer extension READMEs

### Fixed

- Validation and rendering of existing Schema Version `1.0.0` `*.airp.json` documents (broken in 1.1.2 after the schema `1.1.0` rebuild)
- Document schema `$id` URLs now point at the published `JSON-SCHEMA-v*` tags (previous `$id` values were wrong)
- HTML chrome requires the document’s Schema Version instead of a stand-in protocol label

## [1.1.2] - 2026-09-22

### Added

- Protocol Schema Version `1.1.0`: required Machine Handle `@id` on Blocks; Plain String / Markdown String copy types; single-locale `i18n.locale`; `createdBy` / `updatedBy` instead of `authors`
- Side-by-side support for Schema Versions `1.0.0` and `1.1.0` in protocol, validate, and render
- Published Validate CLI `@airp/validate-cli` (`airp-validate`) on npm (text / JSON reporters)
- AIRP Renderer VS Code / Cursor extension for reading `*.airp.json` and exporting HTML / Markdown
- pnpm + Turbo monorepo under `packages/` and `apps/` with `@airp/*` libraries

### Changed

- `/airp` Skill focuses on authoring and validation (no longer ships bundled dashboard / HTML / Markdown render skills with vendored renderer dist)

### Removed

- Removed `/airp-dashboard`, `/airp-html`, and `/airp-markdown` skills; use the AIRP Renderer extension (renderer-cli remains for local / dev use)
- Removed the previous monolithic `renderer/` package and skill-vendored build layout

## [1.0.0] - 2026-06-16

### Added

- Initial AIRP document schema (`schemaVersion` `1.0.0`) with structured Blocks, multilingual `i18n`, and JSON Schema validation
- `/airp` Skill to generate and validate `*.airp.json` sources
- `/airp-dashboard`, `/airp-html`, and `/airp-markdown` skills for browser preview and HTML / Markdown export
- HTML and Markdown render targets with locale selection, themes, and Mermaid diagrams
- Multilingual project READMEs

[1.1.4]: https://github.com/maosong-ai/airp/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/maosong-ai/airp/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/maosong-ai/airp/compare/v1.0.0...v1.1.2
[1.0.0]: https://github.com/maosong-ai/airp/releases/tag/v1.0.0
