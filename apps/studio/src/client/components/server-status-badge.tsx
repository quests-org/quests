enum RunState {
  commandError = "command_error",
  error = "error",
  pendingAppReady = "pending_app_ready",
  running = "running",
  starting = "starting",
  stopped = "stopped",
  stopping = "stopping",
}

type RunStateType =
  | "command_error"
  | "error"
  | "pending_app_ready"
  | "running"
  | "starting"
  | "stopped"
  | "stopping";

const statusColors: Record<RunStateType, string> = {
  [RunState.commandError]: "fill-red-400",
  [RunState.error]: "fill-red-400",
  [RunState.pendingAppReady]: "fill-gray-400",
  [RunState.running]: "fill-green-400",
  [RunState.starting]: "fill-yellow-400",
  [RunState.stopped]: "fill-gray-400",
  [RunState.stopping]: "fill-gray-400",
};

const statusText: Record<RunStateType, string> = {
  [RunState.commandError]: "Error",
  [RunState.error]: "Error",
  [RunState.pendingAppReady]: "Not ready",
  [RunState.running]: "Running",
  [RunState.starting]: "Starting",
  [RunState.stopped]: "Stopped",
  [RunState.stopping]: "Stopping",
};

export function ServerStatusBadge({ state }: { state: RunStateType }) {
  return (
    <span
      className={`
        inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs
        font-medium text-white
      `}
    >
      <svg
        aria-hidden="true"
        className={`size-1.5 ${statusColors[state]}`}
        viewBox="0 0 6 6"
      >
        <circle cx={3} cy={3} r={3} />
      </svg>
      {statusText[state]}
    </span>
  );
}
