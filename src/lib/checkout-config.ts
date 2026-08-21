import { plans, type Plan, type PlanTier } from '@/lib/plans';

export type BillingInterval = 'month' | 'year';

export const CHECKOUT_BUILD_ID = 'boliviq-checkout-embedded-page-20260715-0120Z';
export const BILLING_IMPLEMENTATION_VERSION = 'embedded_page_v4';
export const CHECKOUT_HANDLER_NAME = 'createBoliviqCheckoutSession';
export const CHECKOUT_UI_MODE: string = 'embedded_page';
export const CHECKOUT_RETURN_PATH = '/billing?checkout=success';

export type BillingOption = {
  planTier: Exclude<PlanTier, 'free'>;
  planName: string;
  interval: BillingInterval;
  lookupKey: string;
  amount: number;
  buttonLabel: string;
};

export function listBillingOptions(catalog: Plan[] = plans): BillingOption[] {
  return catalog.flatMap((plan) => {
    if (!plan.priceMonthly || !plan.priceYearly || plan.tier === 'free') return [];
    return [
      {
        planTier: plan.tier,
        planName: plan.name,
        interval: 'month' as const,
        lookupKey: plan.priceMonthly,
        amount: plan.monthly,
        buttonLabel: `Choose ${plan.name}`,
      },
      {
        planTier: plan.tier,
        planName: plan.name,
        interval: 'year' as const,
        lookupKey: plan.priceYearly,
        amount: plan.annual,
        buttonLabel: `Choose ${plan.name}`,
      },
    ];
  });
}

export function getBillingOption(planTier: string, interval: string, catalog: Plan[] = plans): BillingOption {
  const option = listBillingOptions(catalog).find((item) => item.planTier === planTier && item.interval === interval);
  if (!option) throw new Error('Invalid plan or billing interval.');
  return option;
}

export function getBillingOptionByLookupKey(lookupKey: string, catalog: Plan[] = plans): BillingOption {
  const option = listBillingOptions(catalog).find((item) => item.lookupKey === lookupKey);
  if (!option) throw new Error('Invalid checkout price lookup key.');
  return option;
}

export function buildCheckoutSessionParams(input: {
  stripePriceId: string;
  mode: 'subscription' | 'payment';
  returnUrl: string;
  customerId: string;
  userId: string;
  planTier: string;
  planName: string;
  interval: BillingInterval;
  priceLookupKey: string;
  promotionCodeId?: string;
  couponCode?: string;
}) {
  return {
    line_items: [{ price: input.stripePriceId, quantity: 1 }],
    mode: input.mode,
    ui_mode: CHECKOUT_UI_MODE,
    return_url: input.returnUrl,
    customer: input.customerId,
    allow_promotion_codes: input.promotionCodeId ? undefined : true,
    ...(input.promotionCodeId && { discounts: [{ promotion_code: input.promotionCodeId }] }),
    metadata: {
      userId: input.userId,
      planTier: input.planTier,
      planName: input.planName,
      billingInterval: input.interval,
      priceLookupKey: input.priceLookupKey,
      checkoutBuildId: CHECKOUT_BUILD_ID,
      ...(input.couponCode && { boliviq_coupon: input.couponCode }),
    },
    ...(input.mode === 'subscription' && {
      subscription_data: {
        metadata: {
          userId: input.userId,
          planTier: input.planTier,
          planName: input.planName,
          billingInterval: input.interval,
          priceLookupKey: input.priceLookupKey,
          checkoutBuildId: CHECKOUT_BUILD_ID,
          ...(input.couponCode && { boliviq_coupon: input.couponCode }),
        },
      },
    }),
  };
}

export function sanitizeCheckoutSessionParams(params: ReturnType<typeof buildCheckoutSessionParams>) {
  const lineItem = params.line_items[0];
  const maskedPrice = lineItem.price.length > 8 ? `${lineItem.price.slice(0, 6)}…${lineItem.price.slice(-4)}` : 'configured';
  return {
    ...params,
    customer: 'cus_…masked',
    line_items: [{ ...lineItem, price: maskedPrice }],
    discounts: 'discounts' in params ? '[promotion_code configured]' : undefined,
  };
}
