import { html } from "hono/html";
import path from "node:path";

import { createAppConfig } from "../../lib/app-config/create";
import { type AppConfig } from "../../lib/app-config/types";
import { getProjects, getSandboxesForProject } from "../../lib/get-apps";
import { type RuntimeActorRef } from "../../machines/runtime";
import { type WorkspaceApp } from "../../schemas/app";
import { type AppSubdomain } from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { getWorkspaceServerPort } from "./url";

interface AppAndStatus {
  app: WorkspaceApp;
  children: AppAndStatus[];
  config: AppConfig;
  port?: number;
  status: string;
}

export async function RuntimeList({
  runtimeRefs,
  workspaceConfig,
}: {
  runtimeRefs: Map<AppSubdomain, RuntimeActorRef>;
  workspaceConfig: WorkspaceConfig;
}) {
  const projects = await getProjects(workspaceConfig);
  const projectsWithExtra = await Promise.all(
    projects.projects.map(async (project) => {
      return await getAppWithExtra({
        project,
        runtimeRefs,
        workspaceConfig,
      });
    }),
  );

  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Apps Server</title>
        <script>
          let updateInterval;
          let isLive = true;

          function updateContent() {
            fetch(window.location.href)
              .then((response) => {
                if (!response.ok) {
                  throw new Error("HTTP error! Status: " + response.status);
                }
                return response.text();
              })
              .then((html) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                const newContent = doc.querySelector("#runtime-content");
                const currentContent =
                  document.querySelector("#runtime-content");
                if (currentContent && newContent) {
                  currentContent.innerHTML = newContent.innerHTML;
                }
                // Reset live status if update succeeds
                if (!isLive) {
                  isLive = true;
                  document.getElementById("live-status").style.display = "none";
                }
              })
              .catch((error) => {
                console.error("Failed to update content:", error);
                clearInterval(updateInterval);
                isLive = false;
                document.getElementById("live-status").style.display = "flex";
              });
          }

          updateInterval = setInterval(updateContent, 1000);
        </script>
      </head>
      <body class="bg-neutral-900 text-neutral-100 p-8 font-mono">
        <div
          id="live-status"
          class="fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded hidden"
        >
          <span>Updates failed</span>
          <button onclick="window.location.reload()" class="ml-2 underline">
            Refresh
          </button>
        </div>
        <div id="runtime-content" class="max-w-4xl mx-auto">
          <div
            class="flex items-center justify-between mb-6 border-b border-neutral-700 pb-4"
          >
            <h1 class="text-3xl font-bold">Apps Server</h1>
            ${projectsWithExtra.length > 0
              ? html`<div class="flex items-center gap-3">
                  ${["ready", "loading", "error", "stopped"].map((status) => {
                    const count = projectsWithExtra.filter(
                      (app) => app.status === status,
                    ).length;
                    return count > 0
                      ? html`<div class="flex items-center gap-1">
                          <div
                            class="w-2 h-2 rounded-full ${getStatusColor(
                              status,
                            )}"
                          ></div>
                          <span class="text-sm text-neutral-300">${count}</span>
                        </div>`
                      : "";
                  })}
                </div>`
              : ""}
          </div>

          ${projectsWithExtra.length === 0
            ? html`<div
                class="bg-neutral-800 rounded-lg p-6 text-center text-neutral-400 border border-neutral-700"
              >
                <svg
                  class="w-12 h-12 mx-auto mb-3 text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <p>No apps configured</p>
              </div>`
            : html`<div class="grid gap-4 mb-6">
                ${projectsWithExtra.map(
                  (app) => html`
                    <div
                      class="bg-neutral-800 rounded-lg p-4 border border-neutral-700 flex items-center justify-between"
                    >
                      <div class="flex items-center">
                        <div
                          class="w-3 h-3 rounded-full ${getStatusColor(
                            app.status,
                          )} mr-3"
                          title="${app.status}"
                        ></div>
                        <div class="flex flex-col">
                          <div class="flex items-center gap-2">
                            <a
                              href="${app.app.urls.localhost}"
                              class="text-blue-400 font-medium"
                            >
                              ${app.app.subdomain}
                            </a>
                            <span
                              class="px-1.5 py-0.5 text-xs rounded ${getAppTypeColor(
                                app.config.type,
                              )}"
                            >
                              ${app.config.type}
                            </span>
                          </div>
                          <span class="text-xs text-neutral-400">
                            ${path.relative(
                              app.config.workspaceConfig.rootDir,
                              app.config.appDir,
                            )}
                          </span>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <span
                          class="px-2 py-1 text-xs rounded bg-neutral-700 text-neutral-300"
                        >
                          ${app.status}
                        </span>
                        ${app.port
                          ? html`
                              <span
                                class="px-2 py-1 text-xs rounded bg-blue-900 text-blue-300"
                              >
                                port:${app.port}
                              </span>
                            `
                          : ""}
                      </div>
                    </div>
                    ${app.children.length > 0
                      ? html`
                          <div class="ml-8 space-y-2 mt-2">
                            ${app.children.map(
                              (child) => html`
                                <div
                                  class="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/50 flex items-center justify-between"
                                >
                                  <div class="flex items-center">
                                    <div
                                      class="w-2 h-2 rounded-full ${getStatusColor(
                                        child.status,
                                      )} mr-2"
                                      title="${child.status}"
                                    ></div>
                                    <div class="flex flex-col">
                                      <div class="flex items-center gap-2">
                                        <a
                                          href="${child.app.urls.localhost}"
                                          class="text-blue-400/80 font-medium text-sm"
                                        >
                                          ${child.app.subdomain}
                                        </a>
                                        <span
                                          class="px-1.5 py-0.5 text-xs rounded ${getAppTypeColor(
                                            child.app.type,
                                          )}"
                                        >
                                          ${child.app.type}
                                        </span>
                                      </div>
                                      <span class="text-xs text-neutral-400">
                                        ${path.relative(
                                          child.config.workspaceConfig.rootDir,
                                          child.config.appDir,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div class="flex items-center space-x-2">
                                    <span
                                      class="px-2 py-1 text-xs rounded bg-neutral-700/50 text-neutral-300"
                                    >
                                      ${child.status}
                                    </span>
                                    ${child.port
                                      ? html`
                                          <span
                                            class="px-2 py-1 text-xs rounded bg-blue-900/50 text-blue-300"
                                          >
                                            port:${child.port}
                                          </span>
                                        `
                                      : ""}
                                  </div>
                                </div>
                              `,
                            )}
                          </div>
                        `
                      : ""}
                  `,
                )}
              </div>`}

          <div
            class="mt-8 pt-4 border-t border-neutral-700 text-xs text-neutral-500 flex flex-wrap justify-between"
          >
            <span>Last updated: ${new Date().toLocaleString()}</span>
            <span>Apps Server running on port ${getWorkspaceServerPort()}</span>
            <span class="w-full text-center mt-2"
              >Auto-refreshing every 1s</span
            >
          </div>
        </div>
      </body>
    </html>
  `;
}

function getAppTypeColor(type: AppConfig["type"]): string {
  if (type === "preview") {
    return "bg-blue-500";
  }
  if (type === "project") {
    return "bg-green-500";
  }
  return "bg-yellow-500";
}

async function getAppWithExtra({
  project: app,
  runtimeRefs,
  workspaceConfig,
}: {
  project: WorkspaceApp;
  runtimeRefs: Map<AppSubdomain, RuntimeActorRef>;
  workspaceConfig: WorkspaceConfig;
}): Promise<AppAndStatus> {
  const runtimeRef = runtimeRefs.get(app.subdomain);
  const runtimeSnapshot = runtimeRef?.getSnapshot();
  const port = runtimeSnapshot?.context.port;
  const status = runtimeSnapshot
    ? ([...runtimeSnapshot.tags.values()][0] ?? "stopped")
    : "stopped";

  let children: AppAndStatus[] = [];
  if (app.type === "project") {
    const sandboxes = await getSandboxesForProject(app, workspaceConfig);
    children = await Promise.all(
      sandboxes.map(async (sandbox) => {
        return await getAppWithExtra({
          project: sandbox,
          runtimeRefs,
          workspaceConfig,
        });
      }),
    );
  }

  return {
    app,
    children,
    config: createAppConfig({
      subdomain: app.subdomain,
      workspaceConfig,
    }),
    port,
    status,
  };
}

function getStatusColor(status: string): string {
  switch (status) {
    case "error": {
      return "bg-red-500";
    }
    case "loading": {
      return "bg-yellow-500";
    }
    case "ready": {
      return "bg-green-500";
    }
    case "stopped": {
      return "bg-neutral-500";
    }
    default: {
      return "bg-neutral-500";
    }
  }
}
