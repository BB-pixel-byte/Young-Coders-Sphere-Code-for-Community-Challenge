import base64
import json
import os
import re
from pathlib import Path
from typing import List
import os


def _encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")

def _get_media_type(image_path: str) -> str:
    suffix = Path(image_path).suffix.lower()
    return "image/jpeg" if suffix in [".jpg", ".jpeg"] else "image/png"

def _safe_parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {}


def _fallback_analysis() -> dict:
    return {
        "chore_title": "Chore request (Fallback Triggered)",
        "ai_tools": [],
        "ai_steps": [],
        "ai_skills_needed": [],
        "ai_difficulty": "medium",
        "ai_estimated_time": "Unknown",
        "ai_safety_notes": reason,
    }


def analyze_chore_images(image_paths: List[str], description: str = "") -> dict:
    if not image_paths:
        return _fallback_analysis()

    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        return _fallback_analysis()

    # Use first image only
    image_path = image_paths[0]
    base64_image = _encode_image(image_path)
    media_type = _get_media_type(image_path)

    payload = {
        "model": "nvidia/llama-3.2-90b-vision-instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{base64_image}"
                        }
                    },
                    {
                        "type": "text",
                        "text": f"""You are a helpful assistant for a neighborhood chore app.

Analyze this image of a household chore that a senior needs help with.
Additional context: {description}

Respond in this exact JSON format with no extra text:
{{
    "chore_title": "short title of the chore",
    "tools_needed": ["tool1", "tool2", "tool3"],
    "steps": ["step 1", "step 2", "step 3"],
    "skills_needed": ["skill1", "skill2"],
    "difficulty": "easy/medium/hard",
    "estimated_time": "X minutes",
    "safety_notes": "any safety concerns"
}}"""
                    }
                ]
            }
        ],
        "max_tokens": 1024,
    }

    try:
        response = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        result = response.json()
        text = result["choices"][0]["message"]["content"]
        print(f"NVIDIA raw response: {text}") 
        
        parsed = _safe_parse_json(text)
        if not parsed:
            print("DEBUG ALERT: Failed to parse clean JSON from AI output text string.")
            return _fallback_analysis("AI analysis unavailable: NVIDIA returned a response, but it was not valid JSON.")

        return {
            "chore_title": parsed.get("chore_title", "Chore request"),
            "ai_tools": parsed.get("tools_needed", []),
            "ai_steps": parsed.get("steps", []),
            "ai_skills_needed": parsed.get("skills_needed", []),
            "ai_difficulty": parsed.get("difficulty", "medium"),
            "ai_estimated_time": parsed.get("estimated_time", "Unknown"),
            "ai_safety_notes": parsed.get("safety_notes", "No safety notes available"),
        }
    except Exception as e:
        print(f"NVIDIA AI error: {e}")
        return _fallback_analysis()