const sidebarWidth = 250;
let sidebarVisible = true; // Track sidebar visibility state

export function getSidebarVisible() {
  return sidebarVisible;
}

export function getSidebarWidth() {
  return sidebarVisible ? sidebarWidth : 0;
}

export function hideSidebar() {
  sidebarVisible = false;
}

export function showSidebar() {
  sidebarVisible = true;
}
