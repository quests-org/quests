import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { SUPPORT_URL } from "@quests/shared";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { z } from "zod";

const checkoutSearchSchema = z.object({
  canceled: z.boolean().optional(),
  success: z.boolean().optional(),
});

export const Route = createFileRoute("/_app/checkout")({
  component: CheckoutPage,
  head: () => {
    return {
      meta: [
        {
          title: "Checkout",
        },
        {
          content: "credit-card",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
  validateSearch: checkoutSearchSchema,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { canceled, success } = Route.useSearch();

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Thank you for your subscription. Your account has been updated.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                void navigate({ to: "/" });
              }}
            >
              Get started
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Payment Canceled</CardTitle>
            <CardDescription>
              The checkout process was canceled. No charges were made.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you encountered an issue, please try again or{" "}
              <a
                className="cursor-pointer underline"
                href={SUPPORT_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                contact support
              </a>
              .
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                void navigate({ to: "/subscribe" });
              }}
            >
              Try again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Checkout</CardTitle>
          <CardDescription>
            Please complete your purchase to continue.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => {
              void navigate({ to: "/subscribe" });
            }}
          >
            View Plans
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
