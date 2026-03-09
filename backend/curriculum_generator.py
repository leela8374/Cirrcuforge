import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "").strip()

# Modern HF Inference API v2 (router) — works with valid token
HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"

# Free models via HF (no token needed for these)
HF_SERVERLESS_MODELS = [
    "mistralai/Mistral-7B-Instruct-v0.3",
    "HuggingFaceH4/zephyr-7b-beta",
    "meta-llama/Llama-3.2-3B-Instruct",
    "microsoft/Phi-3.5-mini-instruct",
]

# Legacy inference URL (fallback)
HF_LEGACY_URL = "https://api-inference.huggingface.co/models/{model}"


def _is_valid_key() -> bool:
    """Check if the API key looks valid (starts with hf_ and isn't placeholder)."""
    return (
        HF_API_KEY
        and HF_API_KEY.startswith("hf_")
        and HF_API_KEY != "your-huggingface-api-key-here"
        and len(HF_API_KEY) > 20
    )


def build_system_prompt() -> str:
    return (
        "You are an expert educational curriculum designer. "
        "You produce well-structured, detailed course curricula in clean Markdown. "
        "ALWAYS use Markdown tables (| col | col |) for: weekly breakdown, assessment strategy, "
        "required resources, and recommended references. "
        "Use bullet lists ONLY for learning objectives and teaching methodology. "
        "Be thorough, practical and specific."
    )


def build_user_prompt(subject: str, duration: str, level: str,
                      description: str, objectives: str) -> str:
    extra = ""
    if description:
        extra += f"\nCourse Description: {description}"
    if objectives:
        extra += f"\nSpecific Learning Objectives: {objectives}"

    return f"""Generate a complete, detailed curriculum for:
- Subject: {subject}
- Duration: {duration}
- Education Level: {level}{extra}

Structure EXACTLY as follows (use Markdown):

# 📚 {subject} Curriculum

## 📋 Course Overview
(2-3 sentences about the course)

## 🎯 Learning Objectives
(bullet list of 6-8 objectives)

## 📅 Weekly Breakdown
MUST be a Markdown table with columns:
| Week | Title | Topics Covered | Learning Activities | Assignment / Assessment |

(One row per week or group of weeks, covering all {duration})

## 📊 Assessment Strategy
MUST be a Markdown table with columns:
| Assessment Type | Weight | Timing | Description |

## 📖 Required Resources
MUST be a Markdown table with columns:
| Resource | Type | Notes |

## 📚 Recommended References
MUST be a Markdown table with columns:
| Title | Author / Source | Type |

## 🏫 Teaching Methodology
(bullet list of 4-5 teaching methods)
"""


def _call_router(model: str, system_prompt: str, user_prompt: str) -> dict:
    """Call HF Router API (v1/chat/completions style)."""
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt}
        ],
        "max_tokens": 3000,
        "temperature": 0.7,
        "stream": False
    }
    resp = requests.post(HF_ROUTER_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()

    # OpenAI-compatible response format
    if "choices" in data and data["choices"]:
        text = data["choices"][0].get("message", {}).get("content", "")
        if text.strip():
            return {"curriculum": text.strip()}
    if "error" in data:
        return {"error": str(data["error"])}
    return {"error": "Unexpected response format from HF Router"}


def _call_legacy(model: str, prompt: str) -> dict:
    """Call legacy HF Inference API (for older models)."""
    url = HF_LEGACY_URL.format(model=model)
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 2500,
            "temperature": 0.7,
            "top_p": 0.92,
            "do_sample": True,
            "return_full_text": False
        },
        "options": {"wait_for_model": True}
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()

    if isinstance(data, list) and data:
        text = data[0].get("generated_text", "").strip()
        if text:
            return {"curriculum": text}
    if isinstance(data, dict) and "error" in data:
        return {"error": data["error"]}
    return {"error": "Unexpected legacy API response"}


def _make_weekly_rows(subject: str, duration: str) -> str:
    """Build week rows dynamically based on duration string."""
    import re
    match = re.search(r'(\d+)\s*(week|month|year)', duration.lower())
    if match:
        num = int(match.group(1))
        unit = match.group(2)
        if unit == 'month':
            total_weeks = num * 4
        elif unit == 'year':
            total_weeks = num * 52
        else:
            total_weeks = num
    else:
        total_weeks = 8

    total_weeks = max(2, min(total_weeks, 52))

    phases = [
        ("Introduction & Foundations",
         f"Overview of {subject}, Core concepts & terminology, Historical context, Learning environment setup",
         "Interactive lecture, Q&A session, Orientation quiz",
         "Reflection essay (500 words)"),
        ("Core Concepts — Part I",
         f"Fundamental theories of {subject}, Key methodologies, Primary frameworks",
         "Hands-on workshop, Small group discussions",
         "Concept mapping exercise"),
        ("Core Concepts — Part II",
         f"Advanced foundational topics, Case studies, Problem-solving techniques",
         "Case study analysis, Peer review sessions",
         "Case study report (800 words)"),
        ("Applied Learning",
         f"Practical applications of {subject}, Industry best practices, Real-world examples",
         "Lab / workshop sessions, Guest speaker session",
         "Mid-term project proposal"),
        ("Intermediate Topics",
         f"Advanced methodologies, Critical analysis, Integration with related fields",
         "Seminars, Research tasks, Peer presentations",
         "Research paper (1500 words)"),
        ("Advanced Applications",
         f"Emerging trends in {subject}, Advanced problem-solving, Innovation focus",
         "Project development workshop, Peer reviews",
         "Mid-term project submission"),
        ("Project Development & Integration",
         f"Synthesis of all learnings, Full project development, Presentation skills",
         "Project labs, Presentation preparation",
         "Final project draft"),
        ("Review & Final Presentations",
         f"Course recap, Future learning paths in {subject}, Career guidance",
         "Student presentations, Class feedback, Reflective discussion",
         "Final project + presentation"),
    ]

    rows = []
    week_num = 1
    phase_count = len(phases)
    weeks_per_phase = max(1, total_weeks // phase_count)
    remainder = total_weeks - weeks_per_phase * phase_count

    for i, (title, topics, activities, assignment) in enumerate(phases):
        span = weeks_per_phase + (1 if i < remainder else 0)
        if week_num > total_weeks:
            break
        end_week = min(week_num + span - 1, total_weeks)
        label = f"Week {week_num}" if week_num == end_week else f"Week {week_num}–{end_week}"
        rows.append(f"| {label} | **{title}** | {topics} | {activities} | {assignment} |")
        week_num = end_week + 1

    return "\n".join(rows)


def generate_demo_curriculum(subject: str, duration: str, level: str) -> str:
    """Generates a fully table-structured demo curriculum without API."""
    weekly_rows = _make_weekly_rows(subject, duration)
    return f"""# 📚 {subject} Curriculum

## 📋 Course Overview

This **{level}** level course on **{subject}** is designed for **{duration}**.
Students will gain comprehensive knowledge through a structured, progressive curriculum with
weekly goals, hands-on activities, and continuous assessments.

---

## 🎯 Learning Objectives

By the end of this course, students will be able to:

- Understand foundational concepts and principles of **{subject}**
- Apply theoretical knowledge to real-world problems and scenarios
- Develop critical thinking, analytical, and problem-solving skills
- Design and complete hands-on projects demonstrating subject mastery
- Evaluate industry best practices and emerging trends in **{subject}**
- Collaborate effectively on group projects and peer reviews
- Present findings and projects to an audience with clarity

---

## 📅 Weekly Breakdown

| Week | Title | Topics Covered | Learning Activities | Assignment / Assessment |
|------|-------|----------------|--------------------|-----------------------|
{weekly_rows}

---

## 📊 Assessment Strategy

| Assessment Type | Weight | Timing | Description |
|-----------------|--------|--------|-------------|
| Weekly Assignments | 20% | Every week | Short tasks reinforcing weekly topics |
| Mid-term Project | 25% | Mid-course | Applied project demonstrating core skills |
| Research Paper | 15% | Week 7–8 | Academic paper on a topic of choice |
| Final Project | 30% | Last week | Comprehensive capstone project |
| Class Participation | 10% | Ongoing | Engagement, discussions, peer reviews |

---

## 📖 Required Resources

| Resource | Type | Notes |
|----------|------|-------|
| Course Textbook | Physical / eBook | Provided or recommended by instructor |
| Online Learning Platform | Digital | Coursera / edX / LMS access |
| Laptop / Computer | Hardware | Min. 8 GB RAM recommended |
| Note-taking Tools | Digital / Physical | Notion, OneNote, or paper notebooks |
| Development / Lab Tools | Software | Specific to **{subject}** |

---

## 📚 Recommended References

| Title | Author / Source | Type |
|-------|-----------------|------|
| Academic Journals on {subject} | Various Authors | Journal / Research |
| Coursera – {subject} Specialization | Coursera | Online Course |
| edX – {subject} MicroMasters | edX / Universities | Online Course |
| YouTube Educational Channels | Various Creators | Video Lectures |
| Open-source Documentation | Community / Maintainers | Documentation |

---

## 🏫 Teaching Methodology

- **Flipped Classroom** — Students review materials before class; sessions focus on discussion & application
- **Project-Based Learning** — Real-world tasks and mini-projects throughout the course
- **Collaborative Learning** — Group projects, peer code/work reviews, and team presentations
- **Formative Assessment** — Regular quizzes and assignment feedback to guide improvement
- **Expert Guest Sessions** — Industry practitioners share real-world insights

---

> ⚠️ **Demo Mode:** Your Hugging Face API key is **invalid or expired**.
> Please get a fresh token at https://huggingface.co/settings/tokens
> and update `HUGGINGFACE_API_KEY` in `backend/.env`, then restart the backend.
"""


def generate_curriculum(subject: str, duration: str, level: str,
                        description: str = "", objectives: str = "") -> dict:
    """Main function: tries HF API, falls back to demo curriculum."""

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(subject, duration, level, description, objectives)

    if not _is_valid_key():
        print("⚠️  No valid Hugging Face API key. Using demo mode.")
        return {"curriculum": generate_demo_curriculum(subject, duration, level), "demo": True}

    print(f"🔑 Using HF API key: {HF_API_KEY[:12]}...")

    # ── Try Router API (modern, OpenAI-compatible) ────────────────────────
    for model in HF_SERVERLESS_MODELS:
        try:
            print(f"🤖 Trying Router model: {model}")
            result = _call_router(model, system_prompt, user_prompt)
            if result.get("curriculum"):
                print(f"✅ Success with router model: {model}")
                return result
            print(f"   Router error: {result.get('error', 'empty response')}")
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response else "?"
            print(f"   HTTP {status} for {model}: {e}")
            if status == 401:
                print("   ❌ API key is invalid. Switching to demo mode.")
                break   # No point trying more models with bad key
        except Exception as e:
            print(f"   Exception for {model}: {e}")

    # ── Try Legacy API ────────────────────────────────────────────────────
    legacy_prompt = f"<s>[INST] {system_prompt}\n\n{user_prompt} [/INST]"
    for model in ["mistralai/Mistral-7B-Instruct-v0.2", "HuggingFaceH4/zephyr-7b-beta"]:
        try:
            print(f"🤖 Trying legacy model: {model}")
            result = _call_legacy(model, legacy_prompt)
            if result.get("curriculum"):
                print(f"✅ Success with legacy model: {model}")
                return result
            print(f"   Legacy error: {result.get('error', 'empty')}")
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response else "?"
            print(f"   HTTP {status} for {model}")
            if status == 401:
                break
        except Exception as e:
            print(f"   Exception for {model}: {e}")

    # ── Final fallback ────────────────────────────────────────────────────
    print("⚠️  All models failed. Using demo curriculum.")
    return {"curriculum": generate_demo_curriculum(subject, duration, level), "demo": True}
