import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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

function SubscribePage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const { data: subscriptionData } = useQuery(
    rpcClient.user.subscription.queryOptions({
      input: {},
    }),
  );

  const { data: plansData } = useQuery(rpcClient.user.plans.queryOptions());

  const { mutateAsync: openExternalLink } = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const { mutateAsync: createCheckoutSession } = useMutation(
    rpcClient.stripe.createCheckoutSession.mutationOptions(),
  );

  const currentPlan = subscriptionData?.data?.plan;

  const handleSubscribe = async (plan: PricingPlan) => {
    const priceId = plan.priceIds[billingCycle];
    if (!priceId) {
      toast.error("Failed to start checkout process");
      return;
    }

    try {
      const { data } = await createCheckoutSession({
        priceId,
      });
      const url = data?.url;

      if (!url) {
        toast.error("Failed to start checkout process");
        return;
      }

      await openExternalLink({ url });
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
          {(plansData?.data ?? []).map((plan) => {
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

                <Button
                  className="w-full"
                  disabled={isCurrentPlan}
                  onClick={() => handleSubscribe(plan)}
                  size="lg"
                >
                  {isCurrentPlan ? "Current Plan" : "Subscribe"}
                </Button>
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
