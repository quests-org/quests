import { describe, expect, it } from "vitest";

import { createBashDescription } from "./create-bash-env";

describe("createBashDescription", () => {
  // cspell:ignore unexpand fgrep zcat
  it("matches snapshot", () => {
    expect(createBashDescription()).toMatchInlineSnapshot(`
      "Execute bash commands in the project directory.

      IMPORTANT: This is a sandboxed environment. python and other runtimes
      are NOT available as system binaries. Do NOT attempt to run them directly.
      Use the specialized \`tsx\` command below to execute TypeScript/JavaScript files.

      IMPORTANT: Not a persistent terminal -- each call starts fresh from the project root, so \`cd .\` is always a no-op.

      TIP: Before using an unfamiliar command, run \`<command> --help\` to check its argument syntax.

      Available commands: alias, awk, base64, basename, bash, cat, chmod, clear, column, comm, cp, cut, date, diff, dirname, du, echo, egrep, env, expand, expr, false, fgrep, find, fold, grep, gunzip, gzip, head, help, history, hostname, join, ln, ls, md5sum, mkdir, mv, nl, od, paste, printenv, printf, pwd, readlink, rev, rg, rm, rmdir, sed, seq, sh, sha1sum, sha256sum, sleep, sort, split, stat, strings, tac, tail, tee, time, timeout, touch, tr, tree, true, unalias, unexpand, uniq, wc, whoami, xargs, zcat

      Specialized commands:
        jq - Parse and manipulate JSON
        xan - Fast CSV processing, filtering, aggregation, and visualization
        ffmpeg - Process audio and video files using FFmpeg.
        ffprobe - Probe and inspect audio and video files using FFprobe.
        pnpm - CLI tool for managing JavaScript packages.
        tsx - Execute a TypeScript or JavaScript file. For quick one-liners, prefer -e <code> over writing a file.
        tsc - TypeScript compiler for type-checking. Do not pass individual file paths -- this bypasses tsconfig.json and skips the project's compiler settings.

      Built-in browser (agent-browser):
        agent-browser - Control a built-in browser (Chromium) to navigate the web, interact with pages, and extract content.
          The browser is sandboxed per project -- cookies, localStorage, and sessions are isolated from other projects.
          The browser session persists across multiple agent-browser calls within the same project.
          Do NOT pass --cdp, --session, or --auto-connect flags; these are injected automatically.

          Core navigation:
            agent-browser open <url>          Navigate to a URL
            agent-browser back / forward      Browser history navigation
            agent-browser reload              Reload the current page

          Reading page content (prefer snapshot over screenshot for text extraction):
            agent-browser snapshot            Get accessibility tree with element refs (best for AI)
            agent-browser screenshot [path]   Take a screenshot (saved to a temp file if no path given)
            agent-browser get text [sel]      Get text content of element or full page
            agent-browser get html [sel]      Get innerHTML
            agent-browser get title           Get page title
            agent-browser get url             Get current URL

          Interacting with elements (use refs from snapshot, e.g. @e2, or CSS selectors):
            agent-browser click <sel>         Click an element
            agent-browser fill <sel> <value>  Clear and fill an input
            agent-browser type <sel> <text>   Type into an element
            agent-browser press <key>         Press a key (Enter, Tab, Control+a, etc.)
            agent-browser hover <sel>         Hover over an element
            agent-browser scroll up|down [px] Scroll the page (or --selector <sel> to scroll an element)
            agent-browser select <sel> <val>  Select a dropdown option

          Waiting:
            agent-browser wait <selector>     Wait for element to be visible
            agent-browser wait <ms>           Wait for a number of milliseconds
            agent-browser wait --text <text>  Wait for text to appear on the page
            agent-browser wait --url <pattern> Wait for URL to match a pattern
            agent-browser wait --load networkidle Wait for network to be idle

          Semantic element finders (useful when CSS selectors are unclear):
            agent-browser find role <role> <action> [--name <name>]
            agent-browser find text <text> <action>
            agent-browser find label <label> fill <value>

          JavaScript execution:
            agent-browser eval <js>           Run JavaScript and return the result

          Tabs:
            agent-browser tab                 List open tabs
            agent-browser tab new [url]       Open a new tab
            agent-browser tab <n>             Switch to tab n
            agent-browser tab close [n]       Close a tab

          Cookies and storage:
            agent-browser cookies             Get all cookies
            agent-browser storage local       Get all localStorage
            agent-browser storage local <key> Get a specific localStorage key

          Dialogs:
            agent-browser dialog accept [text] Accept a dialog (with optional prompt text)
            agent-browser dialog dismiss       Dismiss a dialog

          Batch execution (avoids per-command startup overhead):
            echo '[["open","https://example.com"],["snapshot"]]' | agent-browser batch --json

          Example workflow:
            agent-browser open https://example.com
            agent-browser snapshot
            agent-browser click @e3
            agent-browser fill @e5 "hello world"
            agent-browser press Enter
            agent-browser wait --text "Results"
            agent-browser get text"
    `);
  });

  it("includes just-bash built-in tools", () => {
    const description = createBashDescription();
    expect(description).toContain("grep");
    expect(description).toContain("sed");
    expect(description).toContain("awk");
    expect(description).toContain("jq");
    expect(description).toContain("diff");
  });

  it("includes all commands in a single list", () => {
    const description = createBashDescription();
    expect(description).toContain("pnpm");
    expect(description).toContain("grep");
    expect(description).toContain("jq");
  });

  it("includes the sandboxed environment warning", () => {
    const description = createBashDescription();
    expect(description).toContain("sandboxed environment");
  });
});
