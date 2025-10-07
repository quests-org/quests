import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CircleCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { telemetry } from "../lib/telemetry";
import { AIProviderIcon } from "./ai-provider-icon";
import { InternalLink } from "./internal-link";

export function LoginForm({
  modal = false,
  mode: initialMode = "signin",
  onClose,
}: {
  modal?: boolean;
  mode?: "signin" | "signup";
  onClose?: () => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [errorCode, setErrorCode] = useState<null | number>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [signupStep, setSignupStep] = useState<"auth" | "invite">("invite");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<null | string>(null);
  const [isAutoFilledFromClipboard, setIsAutoFilledFromClipboard] =
    useState(false);
  const { mutateAsync: signInSocial } = useMutation(
    rpcClient.auth.signInSocial.mutationOptions(),
  );
  const { mutateAsync: validateBetaInvite } = useMutation(
    rpcClient.auth.validateBetaInvite.mutationOptions(),
  );
  const { mutate: removeTab } = useMutation(
    rpcClient.tabs.close.mutationOptions(),
  );

  const { data: providerMetadataList = [] } = useQuery(
    rpcClient.provider.metadata.list.queryOptions(),
  );

  const isSignUp = mode === "signup";
  const isInviteStep = isSignUp && signupStep === "invite";
  const isAuthStep = isSignUp && signupStep === "auth";
  const isModalBlock = modal && !isInviteStep && !isAuthStep;

  // Check clipboard for invite code on mount
  useEffect(() => {
    const checkClipboardForInviteCode = async () => {
      try {
        // Only check clipboard if we're on the invite step and don't already have a code
        if (isInviteStep && !inviteCode) {
          const clipboardText = await navigator.clipboard.readText();
          const trimmedText = clipboardText.trim();

          if (trimmedText.toLowerCase().startsWith("qu-")) {
            setInviteCode(trimmedText);
            setIsAutoFilledFromClipboard(true);
          }
        }
      } catch {
        // Silently fail if clipboard access is denied or not available
        // This is expected behavior in many browsers for security reasons
      }
    };

    void checkClipboardForInviteCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: authSessionChanged, isFetched } = useQuery(
    rpcClient.user.live.me.experimental_liveOptions({}),
  );

  useEffect(() => {
    if (authSessionChanged?.error) {
      setErrorCode(authSessionChanged.error.code);
    } else if (authSessionChanged && isFetched) {
      onClose?.();
      // TODO: fan this out, show signed in temp in all tabs
      toast.dismiss();

      if (!modal && window.api.tabId) {
        removeTab({ id: window.api.tabId });
      }
    }
  }, [authSessionChanged, isFetched, modal, onClose, removeTab]);

  const handleContinueClick = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isInviteStep) {
      // Validate invite code first
      setIsValidating(true);
      setValidationError(null);

      try {
        // Show spinner for at least 2 seconds
        const [validationResult] = await Promise.all([
          validateBetaInvite({ code: inviteCode.trim() }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);

        if (validationResult.valid) {
          // Move to auth step
          setSignupStep("auth");
        } else {
          setValidationError(
            validationResult.error?.message || "Invalid invite code",
          );
        }
      } catch (error) {
        setValidationError(
          error instanceof Error
            ? error.message
            : "Failed to validate invite code",
        );
      } finally {
        setIsValidating(false);
      }
    } else {
      try {
        // For now, both sign-in and sign-up use the same method
        // TODO: Add invite code validation for sign-up
        await signInSocial({ inviteCode });
      } catch (error) {
        telemetry?.captureException(error);
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-6")}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <a className="flex flex-col items-center gap-2 font-medium" href="#">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-md">
              <QuestsAnimatedLogo size={64} />
            </div>
            <span className="sr-only">Quests</span>
          </a>
          <h1 className="text-3xl font-bold mb-2">
            {isSignUp ? "Sign up for Quests" : "Sign in to Quests"}
          </h1>
          {errorCode && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {errorCode === 401 ? (
                <>
                  You don&apos;t have access to Quests yet. Please join the{" "}
                  <a
                    className="underline underline-offset-4 hover:text-primary"
                    href="https://quests.dev/waitlist"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    waitlist
                  </a>
                  .
                </>
              ) : (
                "There was an error signing in."
              )}
            </p>
          )}
          {isInviteStep && !errorCode && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Quests is currently in private beta. Paste your invite code below
              or{" "}
              <a
                className="underline underline-offset-4 hover:text-primary"
                href="https://quests.dev"
                rel="noopener noreferrer"
                target="_blank"
              >
                join the waitlist
              </a>
              .
            </p>
          )}
          {isAuthStep && !errorCode && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Great! Now continue with Google to complete your account setup.
            </p>
          )}
          {isModalBlock && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              You need to be signed in to use Quests AI features.
            </p>
          )}
        </div>

        {isInviteStep && !errorCode && (
          <form
            className="w-full max-w-md mx-auto"
            onSubmit={(e) => {
              void handleContinueClick(e);
            }}
          >
            <div className="flex relative">
              <Input
                className="grow font-mono pl-12 text-center bg-muted/30 border-border/50 focus:bg-muted/50 transition-colors pr-12"
                disabled={isValidating}
                id="invite-code"
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setValidationError(null); // Clear error when user types
                  setIsAutoFilledFromClipboard(false); // Clear auto-fill indication when user types
                }}
                placeholder="Enter your invite code"
                required
                type="text"
                value={inviteCode}
              />
              <button
                className="absolute right-0 top-0 bottom-0 bg-primary text-primary-foreground flex justify-center items-center px-3 py-2 m-1 rounded-md hover:bg-primary/90 transition-all disabled:opacity-50"
                disabled={!inviteCode.trim() || isValidating}
                type="submit"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>
            {isAutoFilledFromClipboard && !validationError && (
              <p className="text-xs mt-2 text-center flex items-center justify-center gap-1">
                <CircleCheck className="h-4 w-4" />
                Invite code filled from clipboard
              </p>
            )}
            {validationError && (
              <p className="text-destructive text-sm mt-2 text-center">
                {validationError}
              </p>
            )}
          </form>
        )}

        {(isAuthStep || !isSignUp) && !errorCode && (
          <div className="flex flex-col items-center justify-center gap-3">
            <form
              className="flex items-center justify-center gap-3 relative"
              onSubmit={(e) => {
                void handleContinueClick(e);
              }}
            >
              {isAuthStep && (
                <Button
                  className="text-sm text-muted-foreground hover:text-foreground absolute -left-12"
                  onClick={() => {
                    setSignupStep("invite");
                    setValidationError(null); // Clear any validation errors
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Button
                className="w-full min-w-80"
                type="submit"
                variant="default"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>

            <div className="text-sm text-muted-foreground">or</div>

            <div className="flex items-center justify-center gap-3 relative">
              <Button
                className="w-full min-w-80"
                onClick={() => {
                  void vanillaRpcClient.preferences.openSettingsWindow({
                    showNewProviderDialog: true,
                    tab: "Providers",
                  });
                  onClose?.();
                }}
                type="button"
                variant="outline"
              >
                <div className="flex items-center gap-1 mr-2">
                  {providerMetadataList.map(({ type }) => (
                    <AIProviderIcon className="size-4" key={type} type={type} />
                  ))}
                </div>
                Add an AI Provider
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        {errorCode ? (
          <p className="text-sm text-muted-foreground">
            <AuthLink
              className="underline underline-offset-4 hover:text-primary"
              modal={modal}
              onModeChange={(newMode) => {
                setMode(newMode);
                setValidationError(null);
              }}
              to="/register"
            >
              Return to sign up
            </AuthLink>
          </p>
        ) : isSignUp ? (
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <AuthLink
              className="underline underline-offset-4 hover:text-primary"
              modal={modal}
              onModeChange={(newMode) => {
                setMode(newMode);
                setValidationError(null);
              }}
              to="/login"
            >
              Sign in
            </AuthLink>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <AuthLink
              className="underline underline-offset-4 hover:text-primary"
              modal={modal}
              onModeChange={(newMode) => {
                setMode(newMode);
                setValidationError(null);
              }}
              to="/register"
            >
              Sign up
            </AuthLink>
          </p>
        )}
      </div>

      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary border-t border-border/50 pt-6">
        By clicking continue, you agree to our{" "}
        <a href="https://quests.dev/terms-of-service">Terms of Service</a> and{" "}
        <a href="https://quests.dev/privacy-policy">Privacy Policy</a>.
      </div>
    </div>
  );
}

// Small wrapper component for auth-related links that can work in modal mode
function AuthLink({
  children,
  className,
  modal,
  onModeChange,
  to,
}: {
  children: React.ReactNode;
  className?: string;
  modal?: boolean;
  onModeChange?: (mode: "signin" | "signup") => void;
  to: "/login" | "/register";
}) {
  if (modal && onModeChange) {
    const targetMode = to === "/login" ? "signin" : "signup";
    return (
      <button
        className={className}
        onClick={() => {
          onModeChange(targetMode);
        }}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <InternalLink allowOpenNewTab={false} className={className} to={to}>
      {children}
    </InternalLink>
  );
}
