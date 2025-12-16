# Quests Studio

Electron app for Quests.

## Dependencies

Due to how Electron Builder works, client-only (renderer) dependencies should
be listed in `devDependencies` to avoid them being bundled into the app.

- `electron-builder@26.3.4` due to <https://github.com/electron-userland/electron-builder/issues/9451>
