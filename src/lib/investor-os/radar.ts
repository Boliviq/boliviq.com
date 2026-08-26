/** Opportunity Radar — match canonical properties to buy box criteria. */

import type { BuyBoxCriteria } from "./types";

export function scoreRadarMatch(
  property: Record<string, any>,
  criteria: BuyBoxCriteria,
): { match_score: number; reasons: string[]; passes: boolean } {
  const reasons: string[] = [];
  let score = 30;
  let fails = false;

  if (criteria.state && property.state_code && property.state_code !== criteria.state) {
    fails = true;
    reasons.push("Outside target state");
  } else if (criteria.state && property.state_code === criteria.state) {
    score += 10;
    reasons.push("State match");
  }

  if (criteria.countyFips && property.county_fips !== criteria.countyFips) {
    fails = true;
    reasons.push("Outside target county");
  }

  if (criteria.acquisitionMax != null) {
    const acq = property.opening_bid ?? property.estimated_value ?? Infinity;
    if (acq > criteria.acquisitionMax) {
      fails = true;
      reasons.push("Acquisition above max");
    } else {
      score += 12;
      reasons.push("Acquisition within buy box");
    }
  }

  if (criteria.arvMin != null) {
    if ((property.estimated_arv ?? 0) < criteria.arvMin) {
      fails = true;
      reasons.push("ARV below minimum");
    } else {
      score += 10;
      reasons.push("ARV meets minimum");
    }
  }

  if (criteria.rehabMax != null) {
    if ((property.estimated_rehab ?? Infinity) > criteria.rehabMax) {
      fails = true;
      reasons.push("Rehab above max");
    } else {
      score += 8;
      reasons.push("Rehab within max");
    }
  }

  if (criteria.equityPctMin != null) {
    if ((property.equity_pct ?? 0) < criteria.equityPctMin) {
      fails = true;
      reasons.push("Equity below minimum");
    } else {
      score += 12;
      reasons.push(`Equity ≥ ${(criteria.equityPctMin * 100).toFixed(0)}%`);
    }
  }

  if (criteria.distressScoreMin != null) {
    if ((property.distress_score ?? 0) < criteria.distressScoreMin) fails = true;
    else {
      score += 10;
      reasons.push("Distress score threshold met");
    }
  }

  if (criteria.opportunityScoreMin != null) {
    if ((property.opportunity_score ?? 0) < criteria.opportunityScoreMin) fails = true;
    else {
      score += 10;
      reasons.push("Opportunity score threshold met");
    }
  }

  if (criteria.distressPreferred && property.active_distress) {
    score += 8;
    reasons.push("Distress preferred + active distress");
  }

  if (criteria.absenteePreferred && property.absentee_owner) {
    score += 6;
    reasons.push("Absentee owner");
  }

  if (criteria.profitMin != null) {
    const spread = property.potential_spread ?? 0;
    if (spread < criteria.profitMin) fails = true;
    else {
      score += 8;
      reasons.push("Potential profit meets minimum");
    }
  }

  if (property.is_demo) reasons.push("DEMO / TEST DATA");

  score = Math.min(100, Math.round(score + Number(property.opportunity_score ?? 0) * 0.15));
  return { match_score: fails ? Math.min(score, 40) : score, reasons, passes: !fails };
}
