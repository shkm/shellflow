# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1](https://github.com/shkm/One-Man-Band/compare/v0.1.0...v0.1.1) (2026-01-20)


### Features

* add GitHub workflows for releases and changelog ([ca004f3](https://github.com/shkm/One-Man-Band/commit/ca004f3bcb36338c268a4c88f8674ba3549e5fc5))


### Bug Fixes

* correct rust-toolchain action name in build workflow ([b6134ab](https://github.com/shkm/One-Man-Band/commit/b6134abab4945d241e6e2d79ac9885b7c527db5f))
* use vendored OpenSSL for cross-compilation ([be994a7](https://github.com/shkm/One-Man-Band/commit/be994a772c5c9fc92d9cf3c13355c2a97add0111))

## [Unreleased]

### Added
- Initial release with git worktree management
- Configurable main command (default: claude)
- Terminal panel with xterm.js
- File change tracking with git status
- Project and worktree sidebar
- Copy gitignored files to new worktrees
