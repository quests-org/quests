import { COMMON_ORPC_ERROR_DEFS } from "@orpc/client";

const COMMON_IPC_ERROR_DEFS = {
  NO_TOKEN: {
    message: "You've been signed out. Please sign in again.",
  },
  SERVER_CONNECTION_ERROR: {
    message:
      "Unable to connect to the server. Please check your connection and try again.",
  },
  UNKNOWN_IPC_ERROR: {
    message: "There was an error. Please try again.",
  },
};

const ERROR_DEFS = {
  ...COMMON_IPC_ERROR_DEFS,
  ...COMMON_ORPC_ERROR_DEFS,
};

type ErrorCode = keyof typeof ERROR_DEFS;

export const createError = (code: ErrorCode, message?: string) => {
  return {
    code,
    message: message ?? ERROR_DEFS[code].message,
  };
};
