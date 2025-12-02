import { userAtom } from "@/client/atoms/user";
import { useAtom } from "jotai";

export function useUserConnectionError() {
  const [userResult] = useAtom(userAtom);

  const hasError =
    userResult.error?.code === "SERVER_CONNECTION_ERROR" ||
    userResult.error?.code === "UNKNOWN_IPC_ERROR";

  return {
    error: hasError ? userResult.error : null,
    hasError,
  };
}
