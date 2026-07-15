from decimal import Decimal

from .models import OpportunityAnalysis


def build_opportunity_result(lot, *, business_type, budget, business_model="", target_segment="", project_stage="", inputs=None):
    """Return a transparent preliminary fit assessment, never a valuation or guarantee."""
    inputs = inputs or {}
    score = 50
    reasons = []
    risks = []
    next_steps = ["Verify the legal and utility requirements with the provider.", "Visit the site before any financial commitment."]

    is_commercial_activity = business_type.strip().lower() not in {"residential", "سكني", "housing"}
    if is_commercial_activity and lot.usage_type in {"commercial", "mixed", "service"}:
        score += 16
        reasons.append("The listed usage supports the selected commercial activity.")
    elif is_commercial_activity:
        score -= 22
        risks.append("The listed use may not support the selected commercial activity; confirm zoning first.")
    else:
        score += 10
        reasons.append("The selected use is broadly aligned with the lot type.")

    budget_value = Decimal(str(budget))
    if lot.price is None:
        risks.append("The provider has not published a price, so total affordability cannot be confirmed.")
    elif lot.price <= budget_value * Decimal("0.45"):
        score += 12
        reasons.append("The lot price leaves meaningful room in the stated budget for setup and operating needs.")
    elif lot.price <= budget_value * Decimal("0.70"):
        score += 4
        reasons.append("The lot price is within the stated budget, but delivery costs should be checked.")
    else:
        score -= 15
        risks.append("The lot consumes a high portion of the stated budget before fit-out and operating costs.")

    if lot.is_corner:
        score += 6
        reasons.append("Corner positioning can improve visibility and access for suitable activities.")
    if lot.street_width and lot.street_width >= 20:
        score += 5
        reasons.append("The listed street width supports access and frontage potential.")
    if lot.frontage and any(term in lot.frontage.lower() for term in ["main", "رئيس", "commercial", "تجاري"]):
        score += 7
        reasons.append("The frontage description suggests stronger visibility.")

    competition = int(inputs.get("estimated_competitors", lot.metadata.get("estimated_competitors", 0)) or 0)
    if competition >= 8:
        score -= 8
        risks.append("Competition appears high based on the supplied estimate; validate differentiation and demand.")
    elif competition <= 3:
        score += 3
        reasons.append("The supplied competition estimate is moderate to low.")

    neighborhood_fit = int(inputs.get("neighborhood_fit", lot.metadata.get("neighborhood_fit", 50)) or 50)
    if neighborhood_fit >= 70:
        score += 8
        reasons.append("The supplied neighborhood-fit input is favourable.")
    elif neighborhood_fit <= 35:
        score -= 8
        risks.append("The supplied neighborhood-fit input is weak and needs field validation.")

    if lot.area < Decimal("80") and is_commercial_activity:
        risks.append("The listed area is compact for some commercial models; confirm layout requirements.")
    elif lot.area >= Decimal("180"):
        score += 3
        reasons.append("The listed area provides flexibility for the proposed use.")

    score = max(0, min(100, score))
    if score >= 78:
        recommendation = OpportunityAnalysis.Recommendation.STRONG_FIT
    elif score >= 60:
        recommendation = OpportunityAnalysis.Recommendation.PROMISING
    elif score >= 42:
        recommendation = OpportunityAnalysis.Recommendation.REVIEW
    else:
        recommendation = OpportunityAnalysis.Recommendation.NOT_RECOMMENDED

    if not risks:
        risks.append("This is a preliminary assessment and does not replace site, legal, or financial due diligence.")
    next_steps.append("Compare at least two alternatives before choosing a site.")
    return {
        "score": score,
        "recommendation": recommendation,
        "reasons": reasons[:5],
        "risks": risks[:5],
        "next_steps": next_steps,
        "analysis_output": {
            "business_type": business_type,
            "budget": str(budget_value),
            "business_model": business_model,
            "target_segment": target_segment,
            "project_stage": project_stage,
            "disclaimer": "Preliminary decision support using provider and user inputs; not a valuation, financial forecast, legal opinion, or guarantee of success.",
        },
    }
