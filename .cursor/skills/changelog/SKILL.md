---
name: changelog
description: Generate changelog from git commits
disable-model-invocation: true
---

## Approach

1. Use `git` to look for the most recent tagged non-beta version.
2. If the most recent commit doesn't have a tag, use it as the current version.
3. Find the previous version.
4. Inspect the content of any larger commits.
5. Generate a change log for that based on the style of a few of these example change logs down below.
6. Return the results in a markdown code block.

## Guidelines

- Don't include verbatim commit messages.
- Write copy for a general audience.
- Only include the "Features" and "Bug Fixes" sections.

## Example 1

```markdown
## Features

- **Chat mode** has landed! Switch between building apps and chatting with the agent.
- **Projects page** with table view - delete, stop, and manage all your projects in one place.
- Recent projects displayed on new tab.
- Copy button for pre blocks in Markdown.
- Use new projects page for eval viewing.
- Incorporate upstream error messages for multiple matches.

## Bug Fixes

- Full width assistant messages always, and copy button for single line code too.
- Support navigation API even on root pages like not found.
- Remove redundant app type in tab title.
- Remove more markdown in titles.
- Attempt to avoid race condition during project deletion due to session abort.
- Make command/ctrl + r work everywhere unless disabled.
- Disallow creation of session db during entire deletion process.
- Better handle ripgrep arguments.
- Animated stop icon in proper places.

## ⛵︎

_72 commits since v1.5.0_

More will follow.
```

## Example 2

```markdown
## 🧬 Features

- Evals have landed!
- A couple clicks and you can compare rich output from as many models and apps you desire.
- Built-in prompts for standard eval apps and some goofy ones too.
- Suport fo custom eval prompts.
- Dedicated runs page with bulk actions.

## 🩹 Bug Fixes

- Linux: Fixed DBus safe storage issues by setting up direct DBus communication.
- Workspace: Ensured runtime starts when agent session spawns to prevent missing dependencies.
- AI Gateway: Fixed handling of `:latest` style model names (e.g., `gpt-oss:latest`).
- Workspace: Blocked `pnpm dev`, `pnpm start`, and `pnpm run` variants since Quests already manages app lifecycle.

## Water Vehicle

<!-- Image placeholder -->

_23 commits since v1.4.2_
```
