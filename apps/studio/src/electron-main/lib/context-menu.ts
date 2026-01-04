import { type BrowserWindow, type WebContentsView } from "electron";
import contextMenu from "electron-context-menu";

import { isDeveloperMode } from "../stores/preferences";

export function createContextMenu({
  inspectInNewWindow = false,
  windowOrWebContentsView,
}: {
  inspectInNewWindow?: boolean;
  windowOrWebContentsView: BrowserWindow | WebContentsView;
}) {
  return contextMenu({
    menu: (defaultActions, parameters) => {
      const menuItems = [];

      const isFileUrl = parameters.linkURL.startsWith("file://");

      if (parameters.linkURL && !isFileUrl) {
        menuItems.push(defaultActions.copyLink({}));
      }

      if (parameters.mediaType === "image") {
        menuItems.push(
          defaultActions.copyImage({}),
          defaultActions.saveImageAs({}),
        );
      }

      if (parameters.mediaType === "video") {
        menuItems.push(defaultActions.saveVideoAs({}));
      }

      if (parameters.isEditable || parameters.selectionText) {
        if (menuItems.length > 0) {
          menuItems.push(defaultActions.separator());
        }
        menuItems.push(
          defaultActions.cut({}),
          defaultActions.copy({}),
          defaultActions.paste({}),
          defaultActions.separator(),
          defaultActions.selectAll({}),
        );
      } else if (
        !parameters.linkURL &&
        parameters.mediaType !== "image" &&
        parameters.mediaType !== "video"
      ) {
        if (menuItems.length > 0) {
          menuItems.push(defaultActions.separator());
        }
        menuItems.push(defaultActions.selectAll({}));
      }

      if (parameters.selectionText && menuItems.length > 0) {
        menuItems.push(defaultActions.separator());
      }

      if (isDeveloperMode()) {
        if (menuItems.length > 0) {
          menuItems.push(defaultActions.separator());
        }

        if (inspectInNewWindow) {
          menuItems.push({
            click: () => {
              windowOrWebContentsView.webContents.openDevTools({
                mode: "detach",
              });
              windowOrWebContentsView.webContents.inspectElement(
                parameters.x,
                parameters.y,
              );
            },
            label: "Inspect Element in New Window",
          });
        } else {
          menuItems.push(defaultActions.inspect());
        }
      }

      return menuItems;
    },
    window: windowOrWebContentsView,
  });
}
