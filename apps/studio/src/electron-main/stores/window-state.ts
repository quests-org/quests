import { screen } from "electron";
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

const DEFAULT_WIDTH = 1400;
const DEFAULT_HEIGHT = 900;

const store = new Store<WindowState>({
  name: "window-state",
});

export function getWindowState() {
  const stored = store.store as Partial<WindowState> | undefined;
  const defaults = getDefaultState();

  // Merge stored state with defaults to handle partial/corrupted data
  const merged: WindowState = {
    bounds: {
      height: stored?.bounds?.height ?? defaults.bounds.height,
      width: stored?.bounds?.width ?? defaults.bounds.width,
      x: stored?.bounds?.x,
      y: stored?.bounds?.y,
    },
    isMaximized: stored?.isMaximized ?? defaults.isMaximized,
  };

  return ensureWindowVisible(merged);
}

export function setWindowState(value: WindowState) {
  store.set(value);
}

function ensureWindowVisible(state: WindowState) {
  const bounds = state.bounds;

  if (bounds.x === undefined || bounds.y === undefined) {
    return state;
  }

  const visible = screen.getAllDisplays().some((display) => {
    return isWindowWithinBounds(bounds, display.bounds);
  });

  if (!visible) {
    const defaultState = getDefaultState();
    return {
      ...state,
      bounds: {
        ...state.bounds,
        x: defaultState.bounds.x,
        y: defaultState.bounds.y,
      },
      isMaximized: false,
    };
  }

  return state;
}

function getDefaultState(): WindowState {
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    bounds: {
      height: DEFAULT_HEIGHT,
      width: DEFAULT_WIDTH,
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
    },
    isMaximized: false,
  };
}

function isWindowWithinBounds(
  windowBounds: { height: number; width: number; x?: number; y?: number },
  displayBounds: { height: number; width: number; x: number; y: number },
) {
  if (windowBounds.x === undefined || windowBounds.y === undefined) {
    return false;
  }

  return (
    windowBounds.x >= displayBounds.x &&
    windowBounds.y >= displayBounds.y &&
    windowBounds.x + windowBounds.width <=
      displayBounds.x + displayBounds.width &&
    windowBounds.y + windowBounds.height <=
      displayBounds.y + displayBounds.height
  );
}
