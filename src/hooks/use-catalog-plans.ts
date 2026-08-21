import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { plans, type Plan } from "@/lib/plans";
import { applyPriceOverrides, type PlanPriceRow } from "@/lib/plan-catalog";

export function useCatalogPlans() {
  return useQuery({
    queryKey: ["plan-prices"],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from("plan_prices")
        .select("tier, monthly, annual, extra_seat_monthly");
      if (error || !data?.length) return plans;
      return applyPriceOverrides(plans, data as PlanPriceRow[]);
    },
    placeholderData: plans,
    staleTime: 60_000,
  });
}
