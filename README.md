## Pipe Toggler

This extension provides a convenient way to toggle the R pipe operator used in Positron, switching between the `magrittr` pipe `%>%` and the native R pipe `|>`.

- Adds a toggle button to the Action Bar to quickly switch between pipe operators.
- Synchronizes a boolean setting `positron.r.useNativePipe` with Positron's string setting `positron.r.pipe`.
- Changes are applied at the workspace level.

![](https://raw.githubusercontent.com/ntluong95/positron-r-wizard/refs/heads/main/resources/screenshot.png)

## RStudio Addin Picker

This extension also adds a command to list and launch installed RStudio addins from Positron.

- Command: `r.launchAddinPicker`
- Available in the editor action bar for R files (click the tools icon).

Usage:

1. Start an R session in Positron.
2. Run the command (via the action bar button or the command palette).
3. Select an addin from the quick pick list to execute it in the R session.

Note: The addin list is generated dynamically by running a small R snippet that inspects installed packages' `rstudio/addins.dcf` files and writes the result to a temporary JSON file.

## 💡 Future Ideas

- [ ] Add-in picker UI improvements (package separation).
- [ ] Format document respecting the selected pipe style.

## License

This project is licensed under the terms in the `LICENSE` file.
