import { userAtom } from "@/client/atoms/user";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { getDefaultStore, useAtom } from "jotai";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const store = getDefaultStore();
    const userResult = await store.get(userAtom);
    if (userResult.data?.id) {
      redirect({
        throw: true,
        to: "/",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [userResult] = useAtom(userAtom);

  useEffect(() => {
    if (userResult.data?.id) {
      toast.success("You're signed in.");
      void navigate({ to: "/" });
    }
  }, [userResult.data?.id, navigate]);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="flex flex-1 w-full justify-center">
        <div className="max-w-sm">
          <Outlet />
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
