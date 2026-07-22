"""Optional Gemini image analysis with a useful offline fallback."""

import json
import os
import re

from dotenv import load_dotenv

load_dotenv()

try:  # The app still works without the optional Gemini SDK.
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - depends on the local environment
    genai = None
    types = None


def _safe_parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    match = re.search(r"\{.*\}", text or "", re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {}


def _fallback_analysis() -> dict:
    return {
        "chore_title": "Household chore",
        "tools_needed": ["Cleaning cloths", "Protective gloves"],
        "steps": [
            "Clear a safe path around the work area",
            "Gather the tools needed for the task",
            "Complete the chore and check the area before leaving",
        ],
        "skills_needed": ["General household help"],
        "difficulty": "medium",
        "estimated_time": "30–45 minutes",
        "safety_notes": "Keep walkways clear and stop if specialist repair work is needed.",
    }


def analyze_chore_images(
    image_bytes: bytes,
    media_type: str = "image/jpeg",
    description: str = "",
) -> dict:
    """Analyze one chore image, falling back cleanly when Gemini is unavailable."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not image_bytes or not api_key or genai is None:
        return _fallback_analysis()

    prompt = f"""You are helping a senior describe a household chore to a volunteer.
Analyze the attached image. Additional context: {description}

Return JSON only, using this schema:
{{
  "chore_title": "short title",
  "tools_needed": ["tool"],
  "steps": ["clear step"],
  "skills_needed": ["skill"],
  "difficulty": "easy, medium, or hard",
  "estimated_time": "time estimate",
  "safety_notes": "brief safety note"
}}"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=media_type),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        return _safe_parse_json(response.text) or _fallback_analysis()
    except Exception:
        return _fallback_analysis()
