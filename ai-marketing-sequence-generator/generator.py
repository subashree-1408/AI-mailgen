"""Campaign generation functions for the Streamlit application and MailPilot integration."""
import json
import os
import urllib.request
import urllib.error

def demo_sequence(product, audience, goal, platform, tone, count):
    """Generate a clearly labeled, offline sample sequence (not AI-generated)."""
    templates = [
        ("Meet {product}", "Introducing {product}! Made for {audience}. Discover how it fits your needs."),
        ("Why {product}?", "Looking for a better solution? Explore the benefits of {product} and see what makes it worth considering."),
        ("Explore the details", "Curious about {product}? Take a closer look and decide whether it is right for you."),
        ("Questions? We've got answers", "Have questions about {product}? Reach out and learn more before making a decision."),
        ("Ready to get started?", "If {product} sounds right for you, take the next step today."),
    ]
    messages = []
    for i in range(count):
        subject, body = templates[i % len(templates)]
        messages.append({
            "day": 1 + i * 2,
            "subject": subject.format(product=product),
            "message": body.format(product=product, audience=audience),
            "call_to_action": "Learn more",
        })
    return messages


def gemini_sequence(product, audience, goal, platform, tone, count, api_key):
    """Call Google Gemini API using native HTTP request and validate structured campaign content."""
    prompt = f"""
You are a responsible marketing copywriter. Return ONLY a valid JSON object
with a 'messages' array. Each item must have: day (positive integer),
subject (string), message (string), call_to_action (string).
Create {count} distinct, useful messages, with increasing days starting with day 1.
Avoid fabricated testimonials, false urgency, unsupported claims, and spammy language.
Do not invent prices, discounts, or links. Keep messages concise and platform appropriate for {platform}.

Campaign Details:
Product/service: {product}
Audience: {audience}
Goal: {goal}
Platform: {platform}
Tone: {tone}
Number of messages: {count}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.7
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_text)
            items = parsed.get("messages", [])
    except Exception as e:
        raise ValueError(f"Gemini API request failed: {e}")

    if not isinstance(items, list) or len(items) != count:
        raise ValueError("AI response did not contain the requested number of messages. Try again.")

    cleaned = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Invalid AI message format.")
        day = int(item.get("day", 1))
        subject = str(item.get("subject", "")).strip()
        message = str(item.get("message", "")).strip()
        cta = str(item.get("call_to_action", "Learn more")).strip()
        cleaned.append({"day": day, "subject": subject, "message": message, "call_to_action": cta})

    return sorted(cleaned, key=lambda m: m["day"])


def ai_sequence(product, audience, goal, platform, tone, count, api_key, model="gpt-4o-mini"):
    """Call OpenAI and validate structured campaign content."""
    try:
        from openai import OpenAI
    except ImportError:
        raise ValueError("OpenAI package is not installed. Use Gemini mode or install openai.")
        
    client = OpenAI(api_key=api_key)
    system = (
        "You are a responsible marketing copywriter. Return ONLY a valid JSON object "
        "with a 'messages' array. Each item must have: day (positive integer), "
        "subject (string), message (string), call_to_action (string). "
        "Create distinct, useful messages, with increasing days. "
        "Avoid fabricated testimonials, false urgency, unsupported claims, and spammy language. "
        "Do not invent prices, discounts, or links. Keep messages concise and platform appropriate."
    )
    user = (
        f"Product/service: {product}\nAudience: {audience}\nGoal: {goal}\n"
        f"Platform: {platform}\nTone: {tone}\nNumber of messages: {count}\n"
        "Schedule messages on distinct days starting with day 1."
    )
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    raw = response.choices[0].message.content
    data = json.loads(raw or "{}")
    items = data.get("messages")
    if not isinstance(items, list) or len(items) != count:
        raise ValueError("AI response did not contain the requested number of messages. Try again.")
    cleaned = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Invalid AI message format.")
        day = int(item["day"])
        subject = str(item["subject"]).strip()
        message = str(item["message"]).strip()
        cta = str(item["call_to_action"]).strip()
        if day < 1 or not all((subject, message, cta)):
            raise ValueError("AI returned an incomplete message.")
        cleaned.append({"day": day, "subject": subject, "message": message, "call_to_action": cta})
    if sorted(m["day"] for m in cleaned) != sorted(set(m["day"] for m in cleaned)):
        raise ValueError("AI returned duplicate campaign days. Try again.")
    return sorted(cleaned, key=lambda m: m["day"])


def gemini_single_email(recipient, subject, shop_name, tone, length, purpose, domain, instructions, api_key):
    """Generate a single professional email adhering to the exact workflow specifications."""
    length_desc = (
        "1-2 concise paragraphs" if length == "Low" else
        "3-4 comprehensive detailed paragraphs" if length == "High" else
        "2-3 balanced paragraphs with sufficient detail"
    )
    prompt = f"""
You are MailPilot AI. Generate a professional email matching these exact details:
- Recipient: {recipient}
- User Subject: {subject or 'Generate a relevant one'}
- Shop or Business Name: {shop_name or 'the business'}
- Email Tone / Mode: {tone}
- Email Length: {length} ({length_desc})
- Email Type / Purpose: {purpose}
- Business Domain / Category: {domain}
- Additional User Instructions: {instructions or 'None'}

Requirements:
1. Deeply tailor the language to the Business Domain ({domain}) and Shop Name ({shop_name}).
2. Strictly follow the requested Tone ({tone}) and Length ({length}).
3. Return ONLY a JSON object:
{{
  "subject": "Clear relevant subject line",
  "greeting": "e.g. Dear [Name/Team],",
  "body": "The email paragraphs separated by double newlines",
  "closing": "Best regards,",
  "signature": "Your Name"
}}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.7
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw)
            return {
                "subject": parsed.get("subject", subject or f"{purpose} regarding {shop_name or domain}"),
                "body": f"{parsed.get('greeting', 'Hello,')}\n\n{parsed.get('body', '')}\n\n{parsed.get('closing', 'Best regards,')}\n{parsed.get('signature', 'Sender')}".strip()
            }
    except Exception as e:
        raise ValueError(f"Gemini email generation failed: {e}")

