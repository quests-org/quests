import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/debug/errors")({
  component: RouteComponent,
});

function RouteComponent() {
  const knownErrorMutation = useMutation(
    rpcClient.debug.throwError.mutationOptions(),
  );

  const unknownErrorMutation = useMutation(
    rpcClient.debug.throwError.mutationOptions(),
  );

  return (
    <div className="size-full overflow-y-auto">
      <div className="grid w-full grid-cols-1 gap-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Testing</CardTitle>
            <CardDescription>
              Test different error types from the RPC layer
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  knownErrorMutation.mutate({ type: "known" });
                }}
                variant="destructive"
              >
                Throw Known Error
              </Button>
              {knownErrorMutation.error && (
                <p className="text-sm text-destructive">
                  Error: {knownErrorMutation.error.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  unknownErrorMutation.mutate({ type: "unknown" });
                }}
                variant="destructive"
              >
                Throw Unknown Error
              </Button>
              {unknownErrorMutation.error && (
                <p className="text-sm text-destructive">
                  Error: {unknownErrorMutation.error.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
