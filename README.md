## R Addin Picker

This extension also adds a command to list and launch installed R addins from Positron like in RStudio.

- Command: `r.launchAddinPicker`
- Available in the editor action bar for R files (click the tools icon).

Usage:

1. Start an R session in Positron.
2. Run the command (via the action bar button or the command palette).
3. Select an addin from the quick pick list to execute it in the R session.

Note: The addin list is generated dynamically by running a small R snippet that inspects installed packages' `rstudio/addins.dcf` files and writes the result to a temporary JSON file.

![](https://raw.githubusercontent.com/ntluong95/positron-r-wizard/refs/heads/main/resources/screenshot.png)

## Pipe Toggler

This extension provides a convenient way to toggle the R pipe operator used in Positron, switching between the `magrittr` pipe `%>%` and the native R pipe `|>`.

- Adds a toggle button to the Action Bar to quickly switch between pipe operators.
- Synchronizes a boolean setting `positron.r.useNativePipe` with Positron's string setting `positron.r.pipe`.
- Changes are applied at the workspace level.

## Format Pipes

Automatically replaces all pipe operators in the current R file to match your workspace pipe setting.

- Command: `positron-r-wizard.formatPipes` ("R: Format Pipes")
- Replaces all `%>%` with `|>` (or vice versa) based on your `positron.r.pipe` setting.
- Shows a count of replacements made.

Usage:

1. Open an R file with pipe operators.
2. Run the command via the command palette (Ctrl+Shift+P / Cmd+Shift+P).
3. All pipes in the document will be replaced to match your workspace setting.

## R Enhanced Syntax (Extended TextMate Grammar)

This extension provides enhanced syntax highlighting for the R language in Positron by integrating a heavily expanded and modernized TextMate grammar. It extends the default R grammar with improved support for:

- Built-in R functions (base, graphics, stats, utils, grDevices, methods)
- Namespace highlighting for pkg::fun, such as dplyr::select(), ggplot2::ggplot()
- $ accessor highlighting for lists, environments, S3 objects, such as df$column, list_obj$nested$element
- tidyverse-style operators and helper functions
- Backtick-quoted identifiers
- Raw strings (r"{ ... }", r"[...]", etc.)
- Expanded roxygen2 highlighting
- Markdown support inside roxygen comments
- More complete keyword and constant detection

## 💡 Future Ideas

- NA

## License

This project is licensed under the terms in the `LICENSE` file.



