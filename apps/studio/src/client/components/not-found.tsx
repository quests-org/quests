import { Button } from "@/client/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { rpcClient } from "../rpc/client";

export function NotFoundComponent({
  message,
  title = "Not Found",
}: {
  message?: string;
  title?: string;
}) {
  const { mutate: removeTab } = useMutation(
    rpcClient.tabs.close.mutationOptions(),
  );

  const handleCloseTab = () => {
    if (window.api.tabId) {
      removeTab({ id: window.api.tabId });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 p-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-muted-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-4" onClick={handleCloseTab} variant="outline">
          Close tab
        </Button>
      </div>
    </div>
  );
}

export function NotFoundRouteComponent() {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  return <NotFoundComponent message={`Could not find page: ${pathname}`} />;
}
