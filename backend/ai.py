import json
from google import genai
from google.genai import types
from config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

PROMPT = """You are a sales assistant for a solo founder using a simple CRM.
Given the deal context below, write a warm, concise follow-up email and recommend the single best next step.

Return STRICT JSON with exactly these keys:
- "subject": a short email subject line.
- "body": the email body (plain text, 3-6 short sentences, friendly and specific, ready to send).
- "next_step": one concrete recommended next action for the seller (one sentence).

Deal context:
{context}
"""

EXTRA = "\n\nAdditional instructions from the user — follow these closely when writing the email:\n{instructions}"


def generate_follow_up(context: str, instructions: str = "") -> dict:
    prompt = PROMPT.format(context=context)
    if instructions and instructions.strip():
        prompt += EXTRA.format(instructions=instructions.strip())

    response = client.models.generate_content(
        model=settings.AI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    text = (response.text or "").strip()

    if text.startswith("```"):
        text = text.strip("`")
        if "{" in text:
            text = text[text.find("{") : text.rfind("}") + 1]

    try:
        data = json.loads(text)
        return {
            "subject": str(data.get("subject", "")).strip(),
            "body": str(data.get("body", "")).strip(),
            "next_step": str(data.get("next_step", "")).strip(),
        }
    except Exception:
        return {"subject": "Follow-up", "body": text, "next_step": ""}
