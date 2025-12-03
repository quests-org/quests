import { selectedModelURIAtom } from "@/client/atoms/selected-model";
import { userAtom } from "@/client/atoms/user";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { setDefaultModel } from "@/client/lib/set-default-model";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

export function useSignInSocial() {
  const setSelectedModelURI = useSetAtom(selectedModelURIAtom);
  const user = useAtomValue(userAtom);
  const signInCalledRef = useRef(false);

  const { mutateAsync: signInSocial, ...rest } = useMutation(
    rpcClient.auth.signInSocial.mutationOptions(),
  );

  const isSignedIn = Boolean(user.data?.id);

  useEffect(() => {
    if (signInCalledRef.current && isSignedIn) {
      signInCalledRef.current = false;
      void setDefaultModel(setSelectedModelURI);
    }
  }, [isSignedIn, setSelectedModelURI]);

  const signIn = async () => {
    signInCalledRef.current = true;
    captureClientEvent("auth.sign_up_started");
    await signInSocial({});
  };

  return { signIn, ...rest };
}
