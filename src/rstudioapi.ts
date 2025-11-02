/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  window,
  workspace,
  QuickPickItem,
  QuickInputButton,
  ConfigurationTarget,
  ThemeIcon,
  ExtensionContext,
} from "vscode";
import * as positron from "positron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Helper functions
async function isRSessionActive(): Promise<boolean> {
  try {
    const sessions = await positron.runtime.getActiveSessions();
    return sessions.some((s: any) => s && s.runtimeMetadata.languageId === "r");
  } catch {
    return false;
  }
}

async function runTextInTerm(
  code: string,
  focus: boolean = false
): Promise<void> {
  try {
    const mode = focus
      ? positron.RuntimeCodeExecutionMode.Interactive
      : positron.RuntimeCodeExecutionMode.Silent;
    await positron.runtime.executeCode("r", code, focus, undefined, mode);
    console.info("[rTerminal] Code executed:", code);
  } catch (error) {
    console.error("[rTerminal] Error executing code:", error);
    void window.showErrorMessage(
      `Failed to execute code in R console: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function waitForFile(filePath: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for file: ${filePath}`));
      }
    }, 100);
  });
}

// Addin picker types
interface AddinItem extends QuickPickItem {
  name: string;
  package: string;
  binding: string;
  interactive: boolean;
}

// Addin picker functionality
export async function getAddinPickerItems(): Promise<AddinItem[]> {
  const items: AddinItem[] = [];

  // Generate a temporary file path for the JSON output
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `rstudio_addins_${Date.now()}.json`);

  console.log("[getAddinPickerItems] Temp file:", tempFile);

  const rCode = `
    (function() {
        tryCatch({
            # Get all installed packages
            pkgs <- .packages(all.available = TRUE)
            
            process_pkg <- function(pkg) {
                dcf_path <- system.file("rstudio", "addins.dcf", package = pkg)
                if (!file.exists(dcf_path)) return(NULL)
                addins <- read.dcf(dcf_path)
                df <- as.data.frame(addins, stringsAsFactors = FALSE)
                if (nrow(df) == 0) return(NULL)
                rows <- split(df, seq_len(nrow(df)))
                addin_list <- lapply(rows, function(r) {
                    description <- if ("Description" %in% names(r)) r$Description else ""
                    interactive <- if ("Interactive" %in% names(r)) tolower(as.character(r$Interactive)) == "true" else FALSE
                    list(
                        name = r$Name,
                        description = description,
                        binding = r$Binding,
                        interactive = interactive,
                        package = pkg
                    )
                })
                return(addin_list)
            }

            # collect and combine non-null addins
            results <- lapply(pkgs, process_pkg)
            non_null <- Filter(Negate(is.null), results)
            addin_list <- if (length(non_null) > 0) unname(do.call(c, non_null)) else list()
            
            # Write to temp file
            jsonlite::write_json(addin_list, ${JSON.stringify(
    tempFile
  )}, auto_unbox = TRUE)
            cat("Addins written to:", ${JSON.stringify(tempFile)}, "\\n")
        }, error = function(e) {
            cat("Error loading addins:", conditionMessage(e), "\\n")
        })
    })();
    `.trim();

  try {
    // Execute the R code to generate the JSON file
    await runTextInTerm(rCode, false); // focus = false for silent execution

    // Wait for the file to be created
    await waitForFile(tempFile);

    // Read the JSON file
    const fileContent = fs.readFileSync(tempFile, "utf-8");
    const addins = JSON.parse(fileContent);

    console.log(`[getAddinPickerItems] Loaded ${addins.length} addins`);

    // Convert to QuickPickItems
    for (const addin of addins) {
      items.push({
        name: addin.name,
        label: addin.name,
        description: addin.description || "",
        detail: `${addin.package}::${addin.binding}`,
        package: addin.package,
        binding: addin.binding,
        interactive: addin.interactive,
      });
    }

    // Clean up temp file
    fs.unlinkSync(tempFile);
  } catch (error) {
    console.error("[getAddinPickerItems] Error:", error);
    void window.showErrorMessage(
      `Failed to load addins: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return items;
}

export function purgeAddinPickerItems(): void {
  // No-op for now, as we generate items dynamically
}

export async function launchAddinPicker(context?: ExtensionContext): Promise<void> {
  // Check for active R session
  if (!(await isRSessionActive())) {
    void window.showErrorMessage(
      "No active R session. Please start an R session first."
    );
    return;
  }

  // Get addins
  let items = await getAddinPickerItems();

  if (items.length === 0) {
    void window.showInformationMessage(
      "No RStudio addins found. Install packages with addins to use this feature."
    );
    return;
  }

  // Build grouped QuickPick with separators by package and a refresh button
  const qp = window.createQuickPick<AddinItem>();
  qp.placeholder = "Select an R addin to run";
  qp.matchOnDescription = true;
  qp.matchOnDetail = true;

  const refreshButton: QuickInputButton = {
    iconPath: new ThemeIcon("refresh"),
    tooltip: "Refresh addin list",
  };
  qp.buttons = [refreshButton];

  // Recently used persistence key
  function recentConfigKey() {
    return "recentAddins";
  }

  function getRecentKeys(): string[] {
    if (context) {
      return context.workspaceState.get<string[]>(recentConfigKey(), []);
    }
    // Fallback to configuration (should not happen in normal use)
    const cfg = workspace.getConfiguration("positron-r-wizard");
    return cfg.get<string[]>(recentConfigKey(), []);
  }

  async function pushRecentKey(key: string, max = 10) {
    const keys = getRecentKeys();
    const idx = keys.indexOf(key);
    if (idx !== -1) keys.splice(idx, 1);
    keys.unshift(key);
    if (keys.length > max) keys.splice(max);

    try {
      if (context) {
        await context.workspaceState.update(recentConfigKey(), keys);
      } else {
        // Fallback to configuration (should not happen in normal use)
        const cfg = workspace.getConfiguration("positron-r-wizard");
        await cfg.update(recentConfigKey(), keys, ConfigurationTarget.Workspace);
      }
    } catch (error) {
      console.error("[pushRecentKey] Failed to save recent addins:", error);
      // Non-blocking: continue even if persistence fails
    }
  }

  function buildItems(list: AddinItem[]) {
    const byPkg: Record<string, AddinItem[]> = {};
    for (const it of list) {
      const pkg = it.package || "<unknown>";
      if (!byPkg[pkg]) byPkg[pkg] = [];
      byPkg[pkg].push(it);
    }

    const out: any[] = [];

    const recentKeys = getRecentKeys();
    const recentItems: AddinItem[] = [];

    // no-op loop removed

    // build recent items preserving order from recentKeys
    for (const rk of recentKeys) {
      const found = list.find((l) => `${l.package}::${l.binding}` === rk);
      if (found) recentItems.push(found);
    }

    if (recentItems.length > 0) {
      out.push({
        label: `Recently used (${recentItems.length})`,
        kind: -1,
      } as any);
      for (const a of recentItems) {
        out.push({
          label: a.name,
          description: a.description || "",
          detail: `${a.package}::${a.binding}`,
          name: a.name,
          package: a.package,
          binding: a.binding,
          interactive: a.interactive,
        } as AddinItem);
      }
    }

    // Sort packages alphabetically for the remaining items
    for (const pkg of Object.keys(byPkg).sort((a, b) => a.localeCompare(b))) {
      const group = byPkg[pkg];
      if (group.length === 0) continue;
      out.push({ label: `${pkg} (${group.length})`, kind: -1 } as any);
      // sort addins by name
      group.sort((x, y) =>
        (x.name || x.label || "").localeCompare(y.name || y.label || "")
      );
      for (const a of group) {
        out.push({
          label: a.name,
          description: a.description || "",
          detail: `${a.package}::${a.binding}`,
          name: a.name,
          package: a.package,
          binding: a.binding,
          interactive: a.interactive,
        } as AddinItem);
      }
    }

    return out;
  }

  qp.items = buildItems(items);

  // When user triggers refresh button, reload addins
  qp.onDidTriggerButton(async (btn) => {
    if (btn === refreshButton) {
      qp.busy = true;
      try {
        items = await getAddinPickerItems();
        qp.items = buildItems(items);
      } catch (err) {
        console.error("[launchAddinPicker] Refresh error:", err);
        void window.showErrorMessage("Failed to refresh addin list");
      } finally {
        qp.busy = false;
      }
    }
  });

  // Provide a lightweight preview when active item changes (show description in an info message non-intrusively)
  let lastPreview: string | undefined;
  qp.onDidChangeActive((active) => {
    if (!active || active.length === 0) return;
    const sel = active[0];
    const preview = sel.description || sel.detail || "";
    // Avoid spamming the UI with repeated identical previews
    if (preview && preview !== lastPreview) {
      lastPreview = preview;
      // set the value of the placeholder briefly to surface details, non-blocking
      qp.title = sel.detail || "";
    }
  });

  qp.onDidAccept(async () => {
    const selected = qp.selectedItems[0];
    if (selected) {
      qp.hide();
      await pushRecentKey(`${selected.package}::${selected.binding}`);

      // Call the addin function properly - need to get it from the package namespace
      const addinCode = `
        tryCatch({
          addin_func <- get("${selected.binding}", envir = asNamespace("${selected.package}"), inherits = FALSE)
          if (is.function(addin_func)) {
            addin_func()
          } else {
            stop("Addin binding '${selected.binding}' is not a function")
          }
        }, error = function(e) {
          message("Error running addin: ", conditionMessage(e))
        })
      `.trim();

      await sendCodeToRTerminal(addinCode, true);
    }
  });

  qp.onDidHide(() => qp.dispose());
  qp.show();
}

export async function sendCodeToRTerminal(
  code: string,
  focus: boolean = true, //TODO focus = false to execute silently, focus = true for interactive
  mode?: any,
  observer?: any
) {
  // Wrapper around positron.runtime.executeCode that preserves
  // compatibility with callers that pass runtime options (mode/observer).
  // Signature: executeCode(languageId, code, focus, terminal?, mode?, ???, observer?)
  try {
    // Check if user wants to echo code to console
    const config = workspace.getConfiguration("positron-r-wizard");
    const echoCode = config.get<boolean>("echoAddinCode", false);

    // Override focus based on user preference: if echoCode is true, use Interactive mode to show code
    const shouldFocus = echoCode ? true : focus;

    // If mode not provided, default based on focus
    const executionMode =
      mode ??
      (shouldFocus
        ? positron.RuntimeCodeExecutionMode.Interactive
        : positron.RuntimeCodeExecutionMode.Silent);

    if (typeof observer !== "undefined") {
      // Call with observer
      await positron.runtime.executeCode(
        "r",
        code,
        shouldFocus,
        undefined,
        executionMode,
        undefined,
        observer
      );
    } else {
      // Call without observer
      await positron.runtime.executeCode(
        "r",
        code,
        shouldFocus,
        undefined,
        executionMode
      );
    }

    console.info("[sendCodeToRTerminal] Executed:", code);
  } catch (error) {
    console.error("[sendCodeToRTerminal] Error:", error);
    void window.showErrorMessage(
      `Failed to execute code: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
