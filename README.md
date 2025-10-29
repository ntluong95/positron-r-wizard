# Positron R Wizard

This extension provides a convenient way to toggle the R pipe operator used in Positron, switching between the `magrittr` pipe `%>%` and the native R pipe `|>`.

## Features

*   Adds a toggle button to the Action Bar to quickly switch between pipe operators.
*   Synchronizes a boolean setting `positron.r.useNativePipe` with Positron's string setting `positron.r.pipe`.
*   Changes are applied at the workspace level.

## Usage

1.  Click the "R Pipe" toggle in the Action Bar to switch between `magrittr %>%` and `base |>`.
2.  The setting is written to your workspace's `.vscode/settings.json` file

