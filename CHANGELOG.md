# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows semantic versioning.

## [Unreleased]

- Added: RStudio Addin Picker (`r.launchAddinPicker`) — lists installed RStudio addins and executes the selected addin in the active R session.
- Changed: Consolidated addin-related logic into `src/rstudioapi.ts` and removed unused helper files (`src/util.ts`, `src/session.ts`, `src/rTerminal.ts`).
- Fixed: Addressed TypeScript compilation issues and ensured `npx tsc` passes.

## [0.1.0] - Initial

- Initial release with R pipe toggle feature.
