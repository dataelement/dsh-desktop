# Browser Automation CLI Reference

Technical reference for the `browse` CLI tool.

## Table of Contents

- [Architecture](#architecture)
- [Command Reference](#command-reference)
  - [Navigation](#navigation)
  - [Page State](#page-state)
  - [Interaction](#interaction)
  - [Session Management](#session-management)
  - [JavaScript Evaluation](#javascript-evaluation)
  - [Viewport](#viewport)
  - [Network Capture](#network-capture)
- [Configuration](#configuration)
  - [Global Flags](#global-flags)
  - [Environment Variables](#environment-variables)
- [Error Messages](#error-messages)

## Architecture

The browse CLI is a **daemon-based** command-line tool:

- **Daemon process**: A background process manages the browser instance. Auto-starts on the first command (e.g., `browse open`), persists across commands, and stops with `browse stop`.
- **Local mode** (default): Launches a local Chrome/Chromium instance.
- **Remote mode** (Browserbase): Connects to a Browserbase cloud browser session when `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are set.
- **Accessibility-first**: Use `browse snapshot` to get the page's accessibility tree with element refs, then interact using those refs.

## Command Reference

### Navigation

#### `open <url>`

Navigate to a URL. Alias: `goto`. Auto-starts the daemon if not running.

```bash
browse open https://example.com
browse open https://example.com --wait networkidle   # wait for all network requests to finish (useful for SPAs)
browse open https://example.com --wait domcontentloaded
```

The `--wait` flag controls when navigation is considered complete. Values: `load` (default), `domcontentloaded`, `networkidle`. Use `networkidle` for JavaScript-heavy pages that fetch data after initial load.

#### `reload`

Reload the current page.

```bash
browse reload
```

#### `back` / `forward`

Navigate browser history.

```bash
browse back
browse forward
```

---

### Page State

#### `snapshot`

Get the accessibility tree with interactive element refs. This is the primary way to understand page structure.

```bash
browse snapshot
browse snapshot --compact                # tree only, no ref maps
```

Returns a text representation of the page with refs like `@0-5` that can be passed to `click`. Use `--compact` for shorter output when you only need the tree.

#### `screenshot [path]`

Take a visual screenshot. Slower than snapshot and uses vision tokens.

```bash
browse screenshot                        # auto-generated path
browse screenshot ./capture.png          # custom path
browse screenshot --full-page            # capture entire scrollable page
```

#### `get <property> [selector]`

Get page properties. Available properties: `url`, `title`, `text`, `html`, `value`, `box`, `visible`, `checked`.

```bash
browse get url                           # current URL
browse get title                         # page title
browse get text "body"                   # all visible text (selector required)
browse get text ".product-info"          # text within a CSS selector
browse get html "#main"                  # inner HTML of an element
browse get value "#email-input"          # value of a form field
browse get box "#header"                 # bounding box (centroid coordinates)
browse get visible ".modal"              # check if element is visible
browse get checked "#agree"              # check if checkbox/radio is checked
```

**Note**: `get text` requires a CSS selector argument — use `"body"` for full page text.

#### `refs`

Show the cached ref map from the last `browse snapshot`. Useful for looking up element refs without re-running a full snapshot.

```bash
browse refs
```

---

### Interaction

#### `click <ref>`

Click an element by its ref from `browse snapshot` output.

```bash
browse click @0-5                        # click element with ref 0-5
```

#### `click_xy <x> <y>`

Click at exact viewport coordinates.

```bash
browse click_xy 500 300
```

#### `hover <x> <y>`

Hover at viewport coordinates.

```bash
browse hover 500 300
```

#### `type <text>`

Type text into the currently focused element.

```bash
browse type "Hello, world!"
browse type "slow typing" --delay 100    # 100ms between keystrokes
browse type "human-like" --mistakes      # simulate human typing with typos
```

#### `fill <selector> <value>`

Fill an input element matching a CSS selector and press Enter.

```bash
browse fill "#search" "browser automation"
browse fill "input[name=email]" "user@example.com"
browse fill "#search" "query" --no-press-enter   # fill without pressing Enter
```

#### `select <selector> <values...>`

Select option(s) from a dropdown.

```bash
browse select "#country" "United States"
browse select "#tags" "javascript" "typescript"    # multi-select
```

#### `press <key>`

Press a keyboard key or key combination.

```bash
browse press Enter
browse press Tab
browse press Escape
browse press Cmd+A                       # select all (Mac)
browse press Ctrl+C                      # copy (Linux/Windows)
```

#### `scroll <x> <y> <deltaX> <deltaY>`

Scroll at a given position by a given amount.

```bash
browse scroll 500 300 0 -300             # scroll up at (500, 300)
browse scroll 500 300 0 500              # scroll down
```

#### `drag <fromX> <fromY> <toX> <toY>`

Drag from one viewport coordinate to another.

```bash
browse drag 80 80 310 100                # drag with default 10 steps
browse drag 80 80 310 100 --steps 20     # more intermediate steps
browse drag 80 80 310 100 --delay 50     # 50ms between steps
browse drag 80 80 310 100 --button right # use right mouse button
browse drag 80 80 310 100 --xpath        # return source/target XPaths
```

#### `highlight <selector>`

Highlight an element on the page for visual debugging.

```bash
browse highlight "#submit-btn"           # highlight for 2 seconds (default)
browse highlight ".nav" -d 5000          # highlight for 5 seconds
```

#### `is <check> <selector>`

Check element state. Available checks: `visible`, `checked`.

```bash
browse is visible ".modal"               # returns { visible: true/false }
browse is checked "#agree"               # returns { checked: true/false }
```

#### `wait <type> [arg]`

Wait for a condition.

```bash
browse wait load                         # wait for page load
browse wait "selector" ".results"        # wait for element to appear
browse wait timeout 3000                 # wait 3 seconds
```

---

### Session Management

#### `start`

Start the browser daemon manually. Usually not needed — the daemon auto-starts on first command.

```bash
browse start
```

#### `stop`

Stop the browser daemon and close the browser.

```bash
browse stop
browse stop --force                      # force kill if daemon is unresponsive
```

#### `status`

Check whether the daemon is running, its connection details, and current environment.

```bash
browse status
```

#### `env [local|remote]`

Show or switch the browser environment. Without arguments, prints the current environment. With an argument, stops the running daemon and restarts in the specified environment. The switch is sticky — subsequent commands stay in the chosen environment until you switch again or run `browse stop`.

```bash
browse env                               # print current environment
browse env local                         # switch to local Chrome
browse env remote                        # switch to Browserbase (requires API keys)
```

#### `newpage [url]`

Create a new tab, optionally navigating to a URL.

```bash
browse newpage                           # open blank tab
browse newpage https://example.com       # open tab with URL
```

#### `pages`

List all open tabs.

```bash
browse pages
```

#### `tab_switch <index>`

Switch to a tab by its index (from `browse pages`).

```bash
browse tab_switch 1
```

#### `tab_close [index]`

Close a tab. Closes current tab if no index given.

```bash
browse tab_close          # close current tab
browse tab_close 2        # close tab at index 2
```

---

### JavaScript Evaluation

#### `eval <expression>`

Evaluate JavaScript in the page context.

```bash
browse eval "document.title"
browse eval "document.querySelectorAll('a').length"
```

---

### Viewport

#### `viewport <width> <height>`

Set the browser viewport size.

```bash
browse viewport 1920 1080
```

---

### Network Capture

Capture network requests to the filesystem for inspection.

#### `network on`

Enable network request capture. Creates a temp directory where requests and responses are saved as JSON files.

```bash
browse network on
```

#### `network off`

Disable network capture.

```bash
browse network off
```

#### `network path`

Show the capture directory path.

```bash
browse network path
```

#### `network clear`

Clear all captured requests.

```bash
browse network clear
```

---

## Configuration

### Global Flags

#### `--json`

Output as JSON for all commands. Useful for structured, parseable output.

```bash
browse --json get url                    # returns {"url": "https://..."}
browse --json snapshot                   # returns JSON accessibility tree
```

#### `--session <name>`

Run commands against a named session, enabling multiple concurrent browsers.

```bash
browse --session work open https://a.com
browse --session personal open https://b.com
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BROWSERBASE_API_KEY` | For remote mode | API key from https://browserbase.com/settings |
| `BROWSERBASE_PROJECT_ID` | For remote mode | Project ID from Browserbase dashboard |

When both are set, the CLI uses Browserbase remote sessions. Otherwise, it falls back to local Chrome.

### Setting credentials

```bash
export BROWSERBASE_API_KEY="bb_live_..."
export BROWSERBASE_PROJECT_ID="proj_..."
```

Get these values from https://browserbase.com/settings.

---

## Error Messages

**"No active page"**
- The daemon is running but has no page open.
- Fix: Run `browse open <url>`. If the issue persists, run `browse stop` and retry. For zombie daemons: `pkill -f "browse.*daemon"`.

**"Chrome not found"** / **"Could not find local Chrome installation"**
- Chrome/Chromium is not installed or not in a standard location.
- Fix: Install Chrome, or switch to remote with `browse env remote` (no local browser needed).

**"Daemon not running"**
- No daemon process is active. Most commands auto-start the daemon, but `snapshot`, `click`, etc. require an active session.
- Fix: Run `browse open <url>` to start a session.

**Element ref not found (e.g., "@0-5")**
- The ref from a previous snapshot is no longer valid (page changed).
- Fix: Run `browse snapshot` again to get fresh refs.

**Timeout errors**
- The page took too long to load or an element didn't appear.
- Fix: Try `browse wait load` before interacting, or increase wait time.
