import os
import json
import time
import httpx
from typing import Dict, Any, Optional, List
from backend.app.core.config import settings

class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.openai_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY")
        self.anthropic_key = settings.ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY")
        self.gemini_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.custom_base = settings.LLM_CUSTOM_API_BASE
        self.model = settings.LLM_MODEL

    def get_active_provider(self) -> Optional[str]:
        if self.provider != "auto":
            return self.provider
        if self.openai_key:
            return "openai"
        if self.anthropic_key:
            return "anthropic"
        if self.gemini_key:
            return "gemini"
        if self.custom_base:
            return "custom"
        return None

    def is_available(self) -> bool:
        provider = self.get_active_provider()
        if not provider or provider == "none":
            return False
        if provider == "openai" and self.openai_key:
            return True
        if provider == "anthropic" and self.anthropic_key:
            return True
        if provider == "gemini" and self.gemini_key:
            return True
        if provider == "custom" and self.custom_base:
            return True
        return False

    async def generate_investigation(
        self,
        incident_context: Dict[str, Any],
        evidence_signals: List[Dict[str, Any]],
        historical_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Synthesizes an investigation report using the configured LLM.
        Returns None if LLM is unavailable or fails, triggering deterministic fallback.
        """
        provider = self.get_active_provider()
        if not self.is_available() or not provider:
            return None

        system_prompt = (
            "You are WebGuard AI's Autonomous Incident Investigation Engine. "
            "Your objective is to perform technical root-cause correlation and business impact assessment. "
            "CRITICAL RULES:\n"
            "1. Strictly differentiate between 'confirmed_failures' (empirically broken status), "
            "'observations' (neutral telemetry facts), and 'possible_causes' (inferred hypotheses).\n"
            "2. Never fabricate evidence or invent hallucinated causal chains.\n"
            "3. Provide actionable, low-risk remediation recommendations.\n"
            "4. Calculate an objective confidence score between 0.0 and 1.0 based on signal correlation.\n"
            "5. You MUST return ONLY a valid JSON object matching the requested schema without markdown backticks."
        )

        user_prompt = f"""
Analyze the following incident telemetry and correlate multi-module evidence:

[INCIDENT DETAILS]
Title: {incident_context.get('title')}
Severity: {incident_context.get('severity')}
Target URL: {incident_context.get('target_url')}
Initial Evidence: {json.dumps(incident_context.get('evidence', {}), indent=2)}

[EVIDENCE SIGNALS]
{json.dumps(evidence_signals, indent=2)}

[HISTORICAL & BUSINESS CONTEXT]
{json.dumps(historical_context, indent=2)}

Return a strict JSON object with this exact structure:
{{
  "analysis_method": "llm-synthesis ({provider}:{self.model})",
  "incident_title": "{incident_context.get('title')}",
  "severity": "{incident_context.get('severity')}",
  "observations": ["list of neutral factual telemetry observations"],
  "confirmed_failures": ["list of verified failures"],
  "possible_causes": ["list of inferred root-cause hypotheses with rationale"],
  "confidence": 0.85,
  "confidence_rationale": "explanation of score based on signal strength",
  "recommended_actions": ["list of concrete remediation steps"],
  "business_impact": {{
    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
    "user_churn_risk": "narrative assessment",
    "revenue_impact_estimate": "narrative or null",
    "sla_breach_probability": "narrative assessment"
  }},
  "requires_human_approval": true
}}
"""

        try:
            if provider == "openai" or provider == "custom":
                endpoint = f"{self.custom_base or 'https://api.openai.com/v1'}/chat/completions"
                headers = {
                    "Authorization": f"Bearer {self.openai_key or 'custom'}",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"} if provider == "openai" else None
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(endpoint, json=body, headers=headers)
                    if resp.status_code == 200:
                        content = resp.json()["choices"][0]["message"]["content"]
                        return json.loads(content)

            elif provider == "anthropic":
                endpoint = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": self.anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": "claude-3-5-sonnet-20241022",
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.2
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(endpoint, json=body, headers=headers)
                    if resp.status_code == 200:
                        content = resp.json()["content"][0]["text"]
                        return json.loads(content)

            elif provider == "gemini":
                model_name = "gemini-1.5-pro"
                endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_key}"
                body = {
                    "system_instruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"parts": [{"text": user_prompt}]}],
                    "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"}
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(endpoint, json=body)
                    if resp.status_code == 200:
                        candidates = resp.json().get("candidates", [])
                        if candidates:
                            text = candidates[0]["content"]["parts"][0]["text"]
                            return json.loads(text)

        except Exception as e:
            # Graceful logging and fall through to return None
            print(f"[LLMService] Live LLM invocation error: {e}. Falling back to deterministic engine.")
            return None

        return None

llm_service = LLMService()

