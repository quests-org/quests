import Store from "electron-store";

interface WindowState {
  bounds: {
    height: number;
    width: number;
    x?: number;
    y?: number;
  };
  isMaximized: boolean;
}

export const windowStateStore = new Store<WindowState>({
  defaults: {
    bounds: {
      height: 900,
      width: 1400,
    },
    isMaximized: false,
  },
  name: "window-state",
});
