import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/subscribe")({
  component: SubscribePage,
  head: () => {
    return {
      meta: [
        {
          title: "Subscribe",
        },
        {
          content: "gem",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

type BillingCycle = "monthly" | "yearly";

interface PlanFeature {
  text: string;
}

interface PricingPlan {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeature[];
  cta?: string;
  popular?: boolean;
  priceIds: {
    monthly: string | null;
    yearly: string | null;
  };
}

const PLANS: PricingPlan[] = [
  {
    name: "Free",
    description: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [{ text: "Try out Quests" }, { text: "Limited AI usage" }],
    priceIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    name: "Basic",
    description: "",
    monthlyPrice: 10,
    yearlyPrice: 8,
    features: [
      { text: "~250 Chats" },
      { text: "~50 App Generations" },
      { text: "~25 Evals" },
    ],
    cta: "Subscribe",
    priceIds: {
      monthly: "BASIC_MONTHLY",
      yearly: "BASIC_YEARLY",
    },
  },
  {
    name: "Pro",
    description: "",
    monthlyPrice: 25,
    yearlyPrice: 20,
    features: [
      { text: "~500 Chats" },
      { text: "~100 App Generations" },
      { text: "~50 Evals" },
    ],
    cta: "Subscribe",
    priceIds: {
      monthly: "PRO_MONTHLY",
      yearly: "PRO_YEARLY",
    },
  },
];

function SubscribePage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const { data: subscriptionData } = useQuery(
    rpcClient.user.subscription.queryOptions({
      input: {},
    }),
  );

  const { mutateAsync: openExternalLink } = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const currentPlan = subscriptionData?.data?.plan;

  const handleSubscribe = async (plan: PricingPlan) => {
    const priceIdKey = plan.priceIds[billingCycle];
    if (!priceIdKey) {
      return;
    }

    // Map our internal keys to the actual Stripe price IDs from env vars
    // These will be resolved by the API server which has access to the env vars
    const priceIdMap: Record<string, string> = {
      BASIC_MONTHLY: "STRIPE_PRICE_ID_BASIC_MONTHLY",
      BASIC_YEARLY: "STRIPE_PRICE_ID_BASIC_YEARLY",
      PRO_MONTHLY: "STRIPE_PRICE_ID_PRO_MONTHLY",
      PRO_YEARLY: "STRIPE_PRICE_ID_PRO_YEARLY",
    };

    try {
      const apiBaseUrl =
        import.meta.env.VITE_QUESTS_API_BASE_URL || "http://localhost:8787";

      // Call the Stripe checkout endpoint
      const response = await fetch(`${apiBaseUrl}/stripe/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId: priceIdMap[priceIdKey] }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = (await response.json()) as { url: string };

      // Open the Stripe checkout URL in the default browser
      await openExternalLink({ url: data.url });
    } catch (error) {
      toast.error("Failed to start checkout process");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6 mt-6">
            <QuestsAnimatedLogo size={64} />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Purchase a subscription
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Upgrade to access hundreds of AI models and more AI credits
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-6">
          <Tabs
            defaultValue="yearly"
            onValueChange={(value) => setBillingCycle(value as BillingCycle)}
            value={billingCycle}
          >
            <TabsList className="bg-muted dark:bg-muted text-primary-foreground/50">
              <TabsTrigger
                className="dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                value="yearly"
              >
                Yearly
                <span className="text-xs bg-background/20 primary-foreground/10 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </TabsTrigger>
              <TabsTrigger
                className="dark:data-[state=active]:bg-primary dark:data-[state=active]:text-background data-[state=active]:bg-primary data-[state=active]:text-background hover:text-primary-foreground"
                value="monthly"
              >
                Monthly
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const price =
              billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const isCurrentPlan = currentPlan === plan.name;

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

            return (
              <Card className={cardStyles} key={plan.name}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Sparkles className="size-3" />
                      Popular
                    </div>
                  </div>
                )}

                <div className="">
                  <h3 className={titleStyles}>{plan.name}</h3>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-medium">${price}</span>
                    <span className="text-muted-foreground/50 text-xs">
                      /month
                    </span>
                  </div>
                  {price > 0 && (
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      {billingCycle === "yearly"
                        ? "billed annually"
                        : "billed monthly"}
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, index) => (
                    <li
                      className="text-sm text-muted-foreground font-medium"
                      key={index}
                    >
                      {feature.text}
                    </li>
                  ))}
                </ul>

                {plan.cta && (
                  <Button
                    className="w-full"
                    disabled={isCurrentPlan}
                    onClick={() => handleSubscribe(plan)}
                    size="lg"
                  >
                    {isCurrentPlan ? "Current Plan" : plan.cta}
                  </Button>
                )}
                {!plan.cta && (
                  <Button
                    className="w-full disabled:opacity-100"
                    disabled
                    size="lg"
                    variant="outline"
                  >
                    Current
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto mt-12 text-center">
          <div className="px-4 py-2">
            <h2 className="text-lg font-semibold mb-2">
              For Teams & Organizations
            </h2>
            <p className="text-muted-foreground mb-4 max-w-xl mx-auto text-sm">
              Building an AI platform? The Quests team can help you ship
              production-ready AI apps. Contact us for enterprise support, team
              licenses, and consulting.
            </p>
            <Button
              className="h-8 px-4 text-xs"
              onClick={() =>
                openExternalLink({
                  url: "mailto:hello@quests.dev?subject=Quests%20-%20Enterprise%20%26%20Team%20Inquiry",
                })
              }
              size="sm"
              variant="outline"
            >
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
