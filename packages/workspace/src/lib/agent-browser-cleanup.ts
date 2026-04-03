import { execa } from "execa";

import { AGENT_BROWSER_PATH, AGENT_BROWSER_SOCKET_DIR } from "./agent-browser";

export async function closeAllAgentBrowserSessions() {
  await execa(AGENT_BROWSER_PATH, ["close", "--all"], {
    env: { AGENT_BROWSER_SOCKET_DIR },
    reject: false,
  });
}
