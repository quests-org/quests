import { EmailLink } from "@/client/components/email-link";
import { ErrorCard } from "@/client/components/error-card";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Switch } from "@/client/components/ui/switch";
import { useLiveSubscriptionStatus } from "@/client/hooks/use-live-subscription-status";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { createIconMeta } from "@/shared/tabs";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { SALES_EMAIL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { tv } from "tailwind-variants";

export const Route = createFileRoute("/_app/_authenticated/subscribe")({
  component: SubscribePage,
  head: () => {
    return {
      meta: [
        {
          title: "Subscribe",
        },
        createIconMeta("quests"),
      ],
    };
  },
});

type BillingCycle = "monthly" | "yearly";

interface PlanFeature {
  text: string;
}

interface PricingPlan {
  cta?: string;
  description: string;
  features: PlanFeature[];
  monthlyPrice: number;
  name: string;
  popular?: boolean;
  priceIds: {
    monthly: null | string;
    yearly: null | string;
  };
  yearlyPrice: number;
}

const planCardVariants = tv({
  slots: {
    card: "relative flex flex-col overflow-hidden border border-border/50 p-6 shadow-none transition-all",
    title: "text-4xl font-bold",
  },
  variants: {
    plan: {
      Basic: {
        card: "bg-radial-[at_15%_25%] from-emerald-200/50 from-30% via-emerald-100/20 to-background to-80% dark:from-emerald-500/20 dark:from-25% dark:via-emerald-900/10 dark:to-background dark:to-75%",
        title: "text-emerald-700 dark:text-emerald-400",
      },
      Free: {
        card: "bg-card",
        title: "",
      },
      Pro: {
        card: "bg-radial-[at_85%_75%] from-blue-200/40 from-30% via-indigo-100/20 to-background to-80% dark:from-blue-400/20 dark:from-25% dark:via-indigo-500/10 dark:to-background dark:to-75%",
        title: "text-blue-700 dark:text-blue-400",
      },
    },
  },
});

function SubscribePage() {
  const {
    data: plans,
    error: plansError,
    isLoading: isPlansLoading,
  } = useQuery(rpcClient.plans.get.queryOptions());
  const {
    data: subscription,
    error: subscriptionError,
    isLoading: isSubscriptionLoading,
  } = useLiveSubscriptionStatus({ input: { staleTime: 0 } });
  const { mutateAsync: createCheckoutSession } = useMutation(
    rpcClient.stripe.createCheckoutSession.mutationOptions(),
  );
  const { mutateAsync: openExternalLink } = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  const currentPlan = subscription?.plan;

  const [showPlanChangePreview, setShowPlanChangePreview] = useState(false);
  const [selectedPlanForChange, setSelectedPlanForChange] =
    useState<null | PricingPlan>(null);
  const isUpgrade =
    currentPlan === "Basic" && selectedPlanForChange?.name === "Pro";

  const { mutateAsync: getInvoicePreview } = useMutation(
    rpcClient.stripe.getInvoicePreview.mutationOptions(),
  );
  const [invoicePreviewData, setInvoicePreviewData] = useState<Awaited<
    ReturnType<typeof getInvoicePreview>
  > | null>(null);

  const processCheckout = async (priceId: string) => {
    try {
      const { url } = await createCheckoutSession({
        priceId,
      });

      if (!url) {
        toast.error("Failed to start checkout process");
        return;
      }

      await openExternalLink({ url });
    } catch {
      toast.error("Failed to start checkout process");
    }
  };

  const handleSubscribe = async (plan: PricingPlan) => {
    const priceId = plan.priceIds[billingCycle];
    if (!priceId) {
      toast.error("Failed to start checkout process");
      return;
    }

    captureClientEvent("subscribe.subscribe_clicked", {
      billing_cycle: billingCycle,
      plan_name: plan.name,
    });

    const isUpgrade2 = currentPlan === "Basic" && plan.name === "Pro";
    const isDowngrade = currentPlan === "Pro" && plan.name === "Basic";

    if (isUpgrade2 || isDowngrade) {
      try {
        const preview = await getInvoicePreview({ priceId });
        setInvoicePreviewData(preview);
        setSelectedPlanForChange(plan);
        setShowPlanChangePreview(true);
        return;
      } catch {
        toast.error("Failed to load upgrade preview");
        return;
      }
    }

    await processCheckout(priceId);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlanForChange) {
      return;
    }
    const priceId = selectedPlanForChange.priceIds[billingCycle];
    if (!priceId) {
      return;
    }

    await processCheckout(priceId);
    setShowPlanChangePreview(false);
  };

  if (plansError ?? subscriptionError) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-accent/20 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <div className="my-6 flex justify-center">
              <QuestsAnimatedLogo size={64} />
            </div>
            <h1 className="mb-2 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold text-transparent">
              Choose your plan
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Unlock access to hundreds of the most popular AI models
            </p>
          </div>

          <div className="flex justify-center">
            <ErrorCard
              description="We couldn't load the subscription information"
              error={[plansError, subscriptionError]}
              title="Failed to load subscription data"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-accent/20 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <div className="my-6 flex justify-center">
            <QuestsAnimatedLogo size={64} />
          </div>
          <h1 className="mb-2 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold text-transparent">
            Choose your plan
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Unlock access to hundreds of the most popular AI models
          </p>
        </div>

        {(isPlansLoading || isSubscriptionLoading) && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}

        {plans && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 shadow-sm">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    billingCycle === "monthly"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Monthly
                </span>
                <Switch
                  checked={billingCycle === "yearly"}
                  onCheckedChange={(checked) => {
                    const newBillingCycle = checked ? "yearly" : "monthly";
                    setBillingCycle(newBillingCycle);
                    captureClientEvent("subscribe.billing_cycle_changed", {
                      billing_cycle: newBillingCycle,
                    });
                  }}
                />
                <span
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    billingCycle === "yearly"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Yearly
                  <Badge variant="brand">Save 20%</Badge>
                </span>
              </div>
            </div>

            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const price =
                  billingCycle === "monthly"
                    ? plan.monthlyPrice
                    : plan.yearlyPrice;

                const isFreeUser = !currentPlan || currentPlan === "Free";
                const isBasicUser = currentPlan === "Basic";
                const isProUser = currentPlan === "Pro";

                let buttonText = `Get ${plan.name}`;
                let isButtonDisabled = false;
                let showButton = true;
                let showCheckmark = false;
                let variant: "default" | "outline" | "secondary" = "default";

                switch (plan.name) {
                  case "Basic": {
                    if (isFreeUser) {
                      buttonText = `Get ${plan.name}`;
                    } else if (isBasicUser) {
                      buttonText = "Current Plan";
                      showCheckmark = true;
                      variant = "secondary";
                    } else if (isProUser) {
                      buttonText = `Get ${plan.name}`;
                      variant = "outline";
                    }

                    break;
                  }
                  case "Free": {
                    if (isFreeUser) {
                      buttonText = "Current Plan";
                      isButtonDisabled = true;
                      variant = "secondary";
                    } else {
                      showButton = false;
                    }

                    break;
                  }
                  case "Pro": {
                    if (isProUser) {
                      buttonText = "Current Plan";
                      showCheckmark = true;
                      variant = "secondary";
                    } else {
                      buttonText = `Get ${plan.name}`;
                    }

                    break;
                  }
                  // No default
                }

                const { card, title } = planCardVariants({
                  plan: plan.name as "Basic" | "Free" | "Pro",
                });

                return (
                  <Card className={card()} key={plan.name}>
                    <div className="min-h-24">
                      <h3 className={title()}>{plan.name}</h3>

                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-medium">${price}</span>
                        <span className="text-xs text-muted-foreground/50">
                          /month
                        </span>
                      </div>
                      {price > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground/50">
                          {billingCycle === "yearly"
                            ? "billed annually"
                            : "billed monthly"}
                        </p>
                      )}
                    </div>

                    <ul className="mb-6 flex-1 space-y-2">
                      {plan.features.map((feature, index) => (
                        <li
                          className="text-sm font-medium text-muted-foreground"
                          key={index}
                        >
                          {feature.text}
                        </li>
                      ))}
                    </ul>

                    {showButton && (
                      <Button
                        className="w-full gap-2 disabled:opacity-100"
                        disabled={isButtonDisabled}
                        onClick={async () => {
                          if (buttonText === "Current Plan") {
                            void rpcClient.preferences.openSettingsWindow.call({
                              tab: "General",
                            });
                          } else {
                            await handleSubscribe(plan);
                          }
                        }}
                        size="lg"
                        variant={variant}
                      >
                        {showCheckmark && (
                          <CheckCircle2 className={cn("size-4")} />
                        )}
                        {buttonText}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="mx-auto mt-12 max-w-4xl">
              <Card className="relative overflow-hidden border border-border/50 bg-radial-[at_50%_50%] from-violet-200/40 from-35% to-background to-80% p-8 dark:from-violet-500/8 dark:from-35% dark:to-background dark:to-80%">
                <div className="text-center">
                  <h2 className="mb-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
                    Custom Plans
                  </h2>
                  <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
                    Whether you&apos;re a team, agency, or enterprise,
                    we&apos;ll build a plan that fits your needs.
                  </p>
                  <div className="mb-6 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Custom pricing</span>
                    <span>•</span>
                    <span>Priority support SLA</span>
                    <span>•</span>
                    <span>SSO & SAML</span>
                  </div>
                  <Button asChild size="lg" variant="outline">
                    <EmailLink
                      email={SALES_EMAIL}
                      onClick={() => {
                        captureClientEvent("subscribe.contact_us_clicked");
                      }}
                      subject="Quests - Custom Plan Inquiry"
                    >
                      Contact us
                    </EmailLink>
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {showPlanChangePreview && invoicePreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">
              {isUpgrade ? "Confirm Upgrade" : "Confirm Downgrade"}
            </h2>
            <p className="mb-4 text-muted-foreground">
              You are {isUpgrade ? "upgrading" : "downgrading"} to the{" "}
              {selectedPlanForChange?.name} plan.
            </p>

            <div className="mb-6 space-y-2">
              <div className="flex justify-between">
                <span>Amount Due Today:</span>
                <span className="font-bold">
                  $
                  {Math.max(
                    0,
                    invoicePreviewData.amountDue / 100,
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {invoicePreviewData.endingBalance <= 0
                  ? "The remaining value of your current subscription will be credited to your account and applied to future invoices."
                  : "This includes a prorated charge for the remainder of the current billing period."}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowPlanChangePreview(false);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={confirmUpgrade}>
                {invoicePreviewData.amountDue > 0 ? "Confirm & Pay" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
