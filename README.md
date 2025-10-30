# Positron R Wizard

This extension provides a convenient way to toggle the R pipe operator used in Positron, switching between the `magrittr` pipe `%>%` and the native R pipe `|>`.

## Features

- Adds a toggle button to the Action Bar to quickly switch between pipe operators.
- Synchronizes a boolean setting `positron.r.useNativePipe` with Positron's string setting `positron.r.pipe`.
- Changes are applied at the workspace level.

## Usage

1.  Click the "R Pipe" toggle in the Action Bar to switch between `magrittr %>%` and `base |>`.
2.  The setting is written to your workspace's `.vscode/settings.json` file

## RStudio Addin Picker

This extension also adds a command to list and launch installed RStudio addins from Positron.

- Command: `r.launchAddinPicker`
- Available in the editor action bar for R files (click the tools icon).

Usage:

1. Start an R session in Positron.
2. Run the command (via the action bar button or the command palette).
3. Select an addin from the quick pick list to execute it in the R session.

Note: The addin list is generated dynamically by running a small R snippet that inspects installed packages' `rstudio/addins.dcf` files and writes the result to a temporary JSON file.

## Development / Build

Quick commands (PowerShell):

```powershell
cd "d:\04 EXPERIMENTS\positron-r-wizard"
npx tsc --noEmit   # TypeScript typecheck
npm run build      # if you have a build script; otherwise use tsc
npm install        # install dependencies
npx vsce package    # create a .vsix package for installation
```

Make sure Positron and an R runtime are available when testing the addin picker feature.

## Clean up performed

Recent cleanup in `src/` consolidated addin-related helpers into `src/rstudioapi.ts` and removed several now-unused helper files (`src/util.ts`, `src/session.ts`, `src/rTerminal.ts`). The extension was verified to compile with `npx tsc`.

## License

This project is licensed under the terms in the `LICENSE` file.
