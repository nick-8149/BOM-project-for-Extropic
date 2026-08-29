"""
System prompts and template functions for the AI Smart Replacement Engine.

All prompts enforce:
- Data-grounded reasoning (only use provided data)
- Never fabricate specifications
- Return "unknown" for missing data
- Structured JSON output matching Pydantic schemas
"""

REPLACEMENT_GOAL_DESCRIPTIONS = {
    "eol": "End-of-Life Replacement — The original component is approaching or has reached end of life. Find the best active replacement.",
    "compliance": "Compliance Fix — The original component has compliance issues (e.g. non-RoHS). Find a compliant alternative.",
    "cost_reduction": "Cost Reduction — Find a functionally equivalent component that may offer cost advantages while maintaining compatibility.",
    "risk_mitigation": "Risk Mitigation — The original component has elevated supply chain or lifecycle risk. Find a lower-risk alternative.",
}


def build_analysis_prompt(
    original: dict,
    candidates: list[dict],
    replacement_goal: str,
) -> str:
    """Build the structured analysis prompt for the AI provider."""

    goal_description = REPLACEMENT_GOAL_DESCRIPTIONS.get(
        replacement_goal, REPLACEMENT_GOAL_DESCRIPTIONS["eol"]
    )

    candidates_text = ""
    for i, c in enumerate(candidates, 1):
        candidates_text += f"""
--- Candidate {i} ---
Part ID: {c.get('part_id', 'N/A')}
Part Number: {c.get('part_number', 'N/A')}
Description: {c.get('description', 'N/A')}
Category: {c.get('category', 'N/A')}
Package Type: {c.get('package_type', 'N/A')}
Standard/Cert: {c.get('standard_cert', 'N/A')}
Manufacturers: {', '.join(c.get('manufacturers', [])) or 'N/A'}
Suppliers: {len(c.get('suppliers', []))} source(s) — {', '.join(s.get('name', '') for s in c.get('suppliers', [])) or 'N/A'}
Lifecycle Status: {c.get('lifecycle_status', 'N/A')}
EOL Date: {c.get('eol_date', 'N/A')}
Years to EOL: {c.get('years_to_eol', 'N/A')}
RoHS Status: {c.get('rohs_status', 'N/A')}
Risk Level: {c.get('risk_level', 'N/A')}
Risk Score: {c.get('risk_score', 'N/A')}
Description Similarity Score: {c.get('description_similarity', 0):.1f}%
"""

    return f"""You are an expert electronics component engineer analyzing replacement candidates for a BOM (Bill of Materials) management system.

=== TASK ===
Analyze the following replacement candidates for the original component and provide a structured recommendation.

=== REPLACEMENT GOAL ===
{goal_description}

=== ORIGINAL COMPONENT ===
Part Number: {original.get('part_number', 'N/A')}
Description: {original.get('description', 'N/A')}
Category: {original.get('category', 'N/A')}
Package Type: {original.get('package_type', 'N/A')}
Standard/Cert: {original.get('standard_cert', 'N/A')}
Manufacturers: {', '.join(original.get('manufacturers', [])) or 'N/A'}
Suppliers: {len(original.get('suppliers', []))} source(s) — {', '.join(s.get('name', '') for s in original.get('suppliers', [])) or 'N/A'}
Lifecycle Status: {original.get('lifecycle_status', 'N/A')}
EOL Date: {original.get('eol_date', 'N/A')}
Years to EOL: {original.get('years_to_eol', 'N/A')}
RoHS Status: {original.get('rohs_status', 'N/A')}
Risk Level: {original.get('risk_level', 'N/A')}
Risk Score: {original.get('risk_score', 'N/A')}

=== CANDIDATE COMPONENTS ===
{candidates_text}

=== CRITICAL RULES ===
1. ONLY use the data provided above. Do NOT fabricate voltage, current, temperature, footprint, cost, lead time, or any specification not listed.
2. If data is unavailable for a compatibility dimension, set status to "unknown" and explain that data is insufficient.
3. Never claim a candidate is a "guaranteed drop-in replacement" unless ALL required compatibility data is available and matches.
4. For each candidate, evaluate compatibility across these dimensions: category, package, lifecycle, compliance, supplier_availability. Set each to "match", "partial_match", "incompatible", or "unknown".
5. The compatibility_score is an AI ESTIMATE (0-100) based on available data. Clearly state this is NOT a guaranteed engineering compatibility score.
6. Identify ALL differences, risks, and missing information explicitly.
7. Always list what engineering validation is required before approval.

=== REQUIRED JSON OUTPUT ===
Return a valid JSON object with this exact structure:
{{
  "summary": "Brief recommendation summary (2-3 sentences)",
  "recommended_candidate": "part_number of top candidate or null if none suitable",
  "confidence": "high|medium|low",
  "candidates": [
    {{
      "part_id": "id",
      "part_number": "number",
      "manufacturer": "name or null",
      "compatibility_score": 0-100,
      "confidence": "high|medium|low",
      "compatibility": {{
        "category": {{"status": "match|partial_match|incompatible|unknown", "explanation": "..."}},
        "package": {{"status": "match|partial_match|incompatible|unknown", "explanation": "..."}},
        "lifecycle": {{"status": "match|partial_match|incompatible|unknown", "explanation": "..."}},
        "compliance": {{"status": "match|partial_match|incompatible|unknown", "explanation": "..."}},
        "supplier_availability": {{"status": "match|partial_match|incompatible|unknown", "explanation": "..."}}
      }},
      "strengths": ["..."],
      "warnings": ["..."],
      "reasoning": "Why this candidate ranks where it does"
    }}
  ],
  "warnings": ["Overall warnings for the replacement decision"],
  "missing_data": ["List of data that is unavailable but would improve the analysis"],
  "validation_required": ["List of engineering validations needed before approval"],
  "reasoning": "Overall reasoning for the recommendation"
}}

Return ONLY the JSON object. No markdown, no code fences, no extra text."""


def build_explanation_prompt(
    original: dict,
    candidates: list[dict],
    analysis_summary: str,
    question: str,
) -> str:
    """Build a prompt for the AI explanation chat."""

    candidates_brief = ""
    for i, c in enumerate(candidates, 1):
        candidates_brief += f"  {i}. {c.get('part_number', 'N/A')} — {c.get('description', 'N/A')} (Score: {c.get('ai_score', 'N/A')})\n"

    return f"""You are an expert electronics component engineer providing explanation support for a BOM replacement decision.

=== CONTEXT ===
Original Component: {original.get('part_number', 'N/A')} — {original.get('description', 'N/A')}
Category: {original.get('category', 'N/A')} | Package: {original.get('package_type', 'N/A')}
Lifecycle: {original.get('lifecycle_status', 'N/A')} | RoHS: {original.get('rohs_status', 'N/A')}

Candidates analyzed:
{candidates_brief}

Previous analysis summary:
{analysis_summary}

=== CRITICAL RULES ===
1. Answer ONLY based on the data provided above. Do not fabricate specifications.
2. If you cannot answer due to missing data, say so explicitly.
3. Be concise but thorough. Focus on engineering implications.
4. Never claim guaranteed compatibility without complete data.

=== ENGINEER'S QUESTION ===
{question}

Provide a clear, concise answer based solely on the available component data and analysis context."""
