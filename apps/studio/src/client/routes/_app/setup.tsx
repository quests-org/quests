import Particles from "@/client/components/particles";
import { SetupForm } from "@/client/components/setup-form";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/setup")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Welcome to Quests",
        },
        {
          content: "quests",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

function RouteComponent() {
  const { mutate: closeSidebar } = useMutation(
    rpcClient.sidebar.close.mutationOptions(),
  );

  useEffect(() => {
    closeSidebar({});
  }, [closeSidebar]);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="fixed z-10 h-full w-full flex flex-1 justify-center items-center">
        <div className="max-w-sm">
          <SetupForm />
        </div>
      </div>
      <Particles
        color="#155ADE"
        color2="#F7FF9B"
        disableMouseMovement
        ease={80}
        quantityDesktop={350}
        quantityMobile={100}
        refresh
      />
    </div>
  );
}
