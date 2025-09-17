import { type BrowserWindow, Menu } from "electron";

export function onMainWindowContextMenu(
  mainWindow: BrowserWindow,
  props: { x: number; y: number },
) {
  const menu = Menu.buildFromTemplate([
    {
      click: () => {
        mainWindow.webContents.openDevTools({
          mode: "detach",
          title: "DevTools - Sidebar",
        });
      },
      label: "Open DevTools in New Window",
    },
    {
      click: () => {
        mainWindow.webContents.inspectElement(props.x, props.y);
      },
      label: "Inspect Element",
    },
  ]);
  menu.popup({ window: mainWindow });

  return menu;
}
