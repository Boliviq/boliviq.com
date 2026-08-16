import { describe, expect, test } from "vitest";
import {
  CHECKOUT_UI_MODE,
  buildCheckoutSessionParams,
  getBillingOption,
  listBillingOptions,
} from "../src/lib/checkout-config";

describe('Boliviq checkout configuration', () => {
  test('every subscription plan builds embedded_page checkout params', () => {
    for (const option of listBillingOptions()) {
      const params = buildCheckoutSessionParams({
        stripePriceId: `price_${option.lookupKey}`,
        mode: 'subscription',
        returnUrl: 'https://boliviq.com/billing?checkout=success',
        customerId: 'cus_test_customer',
        userId: 'user_test',
        planTier: option.planTier,
        planName: option.planName,
        interval: option.interval,
        priceLookupKey: option.lookupKey,
      });
      expect(params.ui_mode).toBe('embedded_page');
      expect(params.ui_mode).not.toBe('embedded');
      expect(params.return_url).toBe('https://boliviq.com/billing?checkout=success');
      expect('success_url' in params).toBe(false);
      expect(params.metadata.priceLookupKey).toBe(option.lookupKey);
      expect(params.metadata.billingInterval).toBe(option.interval);
      expect(params.metadata.planName).toBe(option.planName);
      expect(params.metadata.plan).toBe(option.planName);
      expect(params.subscription_data.metadata.plan).toBe(option.planName);
    }
  });

  test('monthly and annual intervals resolve to distinct lookup keys', () => {
    const beginnerMonthly = getBillingOption('beginner', 'month');
    const beginnerYearly = getBillingOption('beginner', 'year');
    expect(beginnerMonthly.lookupKey).toBe('beginner_monthly');
    expect(beginnerYearly.lookupKey).toBe('beginner_yearly');
    expect(beginnerMonthly.lookupKey).not.toBe(beginnerYearly.lookupKey);
  });

  test('configured ui mode cannot be legacy embedded', () => {
    expect(CHECKOUT_UI_MODE).toBe('embedded_page');
    expect(CHECKOUT_UI_MODE).not.toBe('embedded');
  });
});
