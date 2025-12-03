import { captureClientEvent } from "@/client/lib/capture-client-event";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";

export function useSignInSocial() {
  const { mutateAsync: signInSocial, ...rest } = useMutation(
    rpcClient.auth.signInSocial.mutationOptions(),
  );

  const signIn = async () => {
    captureClientEvent("auth.sign_up_started");
    await signInSocial({});
  };

  return { signIn, ...rest };
}
