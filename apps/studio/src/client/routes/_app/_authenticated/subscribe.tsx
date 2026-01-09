import { EmailLink } from "@/client/components/email-link";
import { ErrorCard } from "@/client/components/error-card";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
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
  } = useLiveSubscriptionStatus();
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

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-accent/20 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <div className="mt-6 mb-6 flex justify-center">
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
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {plansError && (
          <div className="flex justify-center">
            <ErrorCard
              description="We couldn't load the available subscription plans"
              error={plansError}
              title="Failed to load plans"
            />
          </div>
        )}

        {subscriptionError && (
          <div className="flex justify-center">
            <ErrorCard
              description="We couldn't load your subscription information"
              error={subscriptionError}
              title="Failed to load subscription"
            />
          </div>
        )}

        {plans && (
          <>
            <div className="mb-6 flex justify-center">
              <Tabs
                defaultValue="yearly"
                onValueChange={(value) => {
                  const newBillingCycle = value as BillingCycle;
                  setBillingCycle(newBillingCycle);
                  captureClientEvent("subscribe.billing_cycle_changed", {
                    billing_cycle: newBillingCycle,
                  });
                }}
                value={billingCycle}
              >
                <TabsList className="bg-muted text-primary-foreground/50 dark:bg-muted">
                  <TabsTrigger
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                    value="yearly"
                  >
                    Yearly
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        billingCycle === "yearly"
                          ? "bg-background/20 dark:bg-background/20"
                          : "bg-border",
                      )}
                    >
                      Save 20%
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    className="hover:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-background dark:data-[state=active]:bg-primary dark:data-[state=active]:text-background"
                    value="monthly"
                  >
                    Monthly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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

                let cardStyles =
                  "relative p-6 transition-all flex flex-col border border-border/50 shadow-none";
                let titleStyles = "text-4xl font-bold";

                if (plan.name === "Basic") {
                  cardStyles +=
                    " bg-gradient-to-br from-emerald-100 via-background to-background dark:from-emerald-900/20";
                  titleStyles +=
                    " bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent";
                } else if (plan.name === "Pro") {
                  cardStyles +=
                    " bg-gradient-to-br from-blue-100 via-background to-background dark:from-blue-950/40 dark:via-slate-900/20";
                  titleStyles +=
                    " bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent";
                } else {
                  cardStyles += " bg-card";
                }

                let buttonText = "Subscribe";
                let isButtonDisabled = false;
                let showButton = true;
                let showCheckmark = false;
                let variant: "default" | "outline" | "secondary" = "default";

                switch (plan.name) {
                  case "Basic": {
                    if (isFreeUser) {
                      buttonText = "Subscribe";
                    } else if (isBasicUser) {
                      buttonText = "Current Plan";
                      showCheckmark = true;
                      variant = "secondary";
                    } else if (isProUser) {
                      buttonText = "Downgrade";
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
                    } else if (isBasicUser) {
                      buttonText = "Upgrade";
                    } else {
                      buttonText = "Subscribe";
                    }

                    break;
                  }
                  // No default
                }

                return (
                  <Card className={cardStyles} key={plan.name}>
                    <div className="min-h-24">
                      <h3 className={titleStyles}>{plan.name}</h3>

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
                          <CheckCircle2 className={cn("h-4 w-4")} />
                        )}
                        {buttonText}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="mx-auto mt-12 max-w-4xl">
              <Card className="relative border border-border/50 bg-linear-to-br from-violet-100 via-background to-background p-8 dark:from-violet-950/30 dark:via-slate-900/20">
                <div className="text-center">
                  <h2 className="mb-2 bg-linear-to-r from-violet-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent dark:from-violet-400 dark:to-purple-400">
                    Custom Plans
                  </h2>
                  <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
                    Whether you&apos;re a team, agency, or enterprise,
                    we&apos;ll build a plan that fits your needs.
                  </p>
                  <div className="mb-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    <span>Custom pricing</span>
                    <span>•</span>
                    <span>Priority support SLA</span>
                    <span>•</span>
                    <span>SSO & SAML</span>
                  </div>
                  <Button asChild size="lg">
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
