/** Natural-language → structured filters for AI Acquisition Agent. */

import type { BuyBoxCriteria } from "./types";

export function parseAcquisitionPrompt(prompt: string): {
  filters: BuyBoxCriteria & { city?: string; subtypes?: string[] };
  interpretation: string[];
} {
  const p = prompt.toLowerCase();
  const filters: BuyBoxCriteria & { city?: string; subtypes?: string[] } = {};
  const interpretation: string[] = [];

  if (/nashville|franklin|columbia|hohenwald|middle tennessee|tn\b/.test(p)) {
    filters.state = "TN";
    filters.market = "Nashville MSA";
    interpretation.push("FACT/INFERENCE: Interpreted market as Tennessee / Nashville area.");
  }
  if (/florida|\bfl\b/.test(p)) {
    filters.state = "FL";
    interpretation.push("Interpreted state filter: FL");
  }
  if (/texas|\btx\b/.test(p)) {
    filters.state = "TX";
    interpretation.push("Interpreted state filter: TX");
  }

  const miles = p.match(/(\d+)\s*miles?/);
  if (miles) {
    filters.radiusMiles = Number(miles[1]);
    interpretation.push(`Radius: ${miles[1]} miles`);
  }

  if (/single[- ]family|sfr/.test(p)) {
    filters.propertyTypes = ["residential", "sfr", "single_family"];
    interpretation.push("Property type: single-family / residential");
  }
  if (/multi[- ]?family|duplex|triplex|fourplex/.test(p)) {
    filters.propertyTypes = ["multifamily"];
    interpretation.push("Property type: multifamily");
  }

  const arvBetween = p.match(
    /arv[^0-9]{0,20}(?:between\s+)?\$?([\d,.]+)\s*k?\s*(?:and|to|-)\s*\$?([\d,.]+)\s*k?/i,
  );
  const arvMin = p.match(
    /(?:arv|after[- ]repair)[^0-9]{0,20}(?:over|above|min(?:imum)?)\s*\$?([\d,.]+)\s*k?/i,
  );
  const arvMax = p.match(/(?:arv)[^0-9]{0,20}(?:under|below|max(?:imum)?)\s*\$?([\d,.]+)\s*k?/i);
  if (arvBetween) {
    filters.arvMin = parseMoney(arvBetween[1]);
    filters.arvMax = parseMoney(arvBetween[2]);
    interpretation.push(
      `ARV between ≈ $${filters.arvMin.toLocaleString()} and $${filters.arvMax.toLocaleString()}`,
    );
  } else if (arvMin) {
    filters.arvMin = parseMoney(arvMin[1]);
    interpretation.push(`ARV min ≈ $${filters.arvMin.toLocaleString()}`);
  } else if (arvMax) {
    filters.arvMax = parseMoney(arvMax[1]);
    interpretation.push(`ARV max ≈ $${filters.arvMax.toLocaleString()}`);
  }

  const equity = p.match(/(\d+)\s*%\s*equity|equity[^0-9]{0,10}(\d+)\s*%/);
  if (equity) {
    filters.equityPctMin = Number(equity[1] || equity[2]) / 100;
    interpretation.push(`Min equity ${(filters.equityPctMin * 100).toFixed(0)}%`);
  }

  const rehab = p.match(/rehab[^0-9]{0,20}(?:under|below|max(?:imum)?|<)\s*\$?([\d,.]+)\s*k?/);
  if (rehab) {
    filters.rehabMax = parseMoney(rehab[1]);
    interpretation.push(`Rehab under $${filters.rehabMax.toLocaleString()}`);
  }

  const distress = p.match(/distress(?:\s*score)?[^0-9]{0,20}(?:above|over|>)\s*(\d+)/);
  if (distress) {
    filters.distressScoreMin = Number(distress[1]);
    interpretation.push(`Distress score min ${filters.distressScoreMin}`);
  }
  if (/distress/.test(p)) {
    filters.distressPreferred = true;
  }

  const opp = p.match(/opportunity(?:\s*score)?[^0-9]{0,20}(?:above|over|>)\s*(\d+)/);
  if (opp) {
    filters.opportunityScoreMin = Number(opp[1]);
    interpretation.push(`Opportunity score min ${filters.opportunityScoreMin}`);
  }

  const acq = p.match(/(?:acquisition|purchase|under)\s*\$?([\d,.]+)\s*k?/);
  if (acq && /under|below|max|acquisition|purchase/.test(p)) {
    filters.acquisitionMax = parseMoney(acq[1]);
    interpretation.push(`Acquisition max ≈ $${filters.acquisitionMax.toLocaleString()}`);
  }

  if (/absentee/.test(p)) {
    filters.absenteePreferred = true;
    interpretation.push("Prefer absentee owners");
  }

  const beds = p.match(/(\d+)\+?\s*bed/);
  if (beds) {
    filters.bedsMin = Number(beds[1]);
    interpretation.push(`Beds min ${filters.bedsMin}`);
  }

  if (/foreclosure|auction|pre-?foreclosure/.test(p)) {
    filters.subtypes = [
      "auction_scheduled",
      "notice_of_default",
      "foreclosure_filed",
      "sheriff_sale",
    ];
    interpretation.push("Distress subtypes: foreclosure / auction family");
  }
  if (/tax\s*delinquen|tax\s*lien/.test(p)) {
    filters.subtypes = [...(filters.subtypes ?? []), "tax_delinquent", "tax_lien"];
  }
  if (/condemn|vacant|code/.test(p)) {
    filters.subtypes = [
      ...(filters.subtypes ?? []),
      ...(p.includes("condemn") ? ["condemned"] : []),
      ...(p.includes("vacant") ? ["vacant"] : []),
      ...(p.includes("code") ? ["code_violation"] : []),
    ];
  }

  if (!interpretation.length) {
    interpretation.push("No strong filters parsed — returning broad ranked opportunities.");
  }

  return { filters, interpretation };
}

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  // treat small numbers as thousands when prompt used K shorthand without K captured
  if (n > 0 && n < 1000 && !cleaned.includes(".")) return Math.round(n * 1000);
  return Math.round(n);
}

export function rankAcquisitionMatches(
  properties: Array<Record<string, any>>,
  filters: BuyBoxCriteria & { arvMax?: number; subtypes?: string[] },
): Array<Record<string, any> & { rank_score: number; rank_reasons: string[] }> {
  return properties
    .map((p) => {
      const reasons: string[] = [];
      let score = Number(p.opportunity_score ?? p.distress_score ?? 50);
      if (filters.state && p.state_code === filters.state) {
        score += 5;
        reasons.push("Matches target state");
      }
      if (filters.countyFips && p.county_fips === filters.countyFips) {
        score += 8;
        reasons.push("Matches county");
      }
      if (filters.distressScoreMin != null && (p.distress_score ?? 0) >= filters.distressScoreMin) {
        score += 10;
        reasons.push(`Distress score ${p.distress_score}`);
      }
      if (
        filters.opportunityScoreMin != null &&
        (p.opportunity_score ?? 0) >= filters.opportunityScoreMin
      ) {
        score += 10;
        reasons.push(`Opportunity score ${p.opportunity_score}`);
      }
      if (filters.equityPctMin != null && (p.equity_pct ?? 0) >= filters.equityPctMin) {
        score += 12;
        reasons.push(`Equity ≥ ${(filters.equityPctMin * 100).toFixed(0)}%`);
      }
      if (filters.rehabMax != null && (p.estimated_rehab ?? 0) <= filters.rehabMax) {
        score += 8;
        reasons.push("Rehab within budget");
      }
      if (filters.arvMin != null && (p.estimated_arv ?? 0) >= filters.arvMin) {
        score += 6;
        reasons.push("ARV above minimum");
      }
      if (filters.arvMax != null && (p.estimated_arv ?? Infinity) <= filters.arvMax) {
        score += 4;
      }
      if (filters.acquisitionMax != null) {
        const acq = p.opening_bid ?? p.estimated_value ?? Infinity;
        if (acq <= filters.acquisitionMax) {
          score += 8;
          reasons.push("Acquisition under max");
        }
      }
      if (filters.absenteePreferred && p.absentee_owner) {
        score += 6;
        reasons.push("Absentee owner");
      }
      if (filters.subtypes?.length) {
        const active: string[] = p.active_subtypes ?? [];
        const hit = filters.subtypes.filter((s) => active.includes(s));
        if (hit.length) {
          score += hit.length * 5;
          reasons.push(`Signals: ${hit.join(", ")}`);
        }
      }
      if (p.is_demo) reasons.push("DEMO / TEST DATA");
      return { ...p, rank_score: Math.min(100, Math.round(score)), rank_reasons: reasons };
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}
