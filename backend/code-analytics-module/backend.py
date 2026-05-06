from __future__ import annotations

import json
import os
from typing import Any

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


PORT = int(os.getenv("PORT", "8000"))
AI_PROVIDER = os.getenv("CODE_ANALYTICS_PROVIDER", "local").strip().lower()
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "https://a361-112-134-207-60.ngrok-free.app")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("CODE_ANALYTICS_MODEL", "llama-3.1-8b-instant")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:3000,"
    "https://smart-lms-eight.vercel.app,"
    "https://api.smartapi.infinityfreeapp.com"
)
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",") if origin.strip()]


app = FastAPI(title="Smart LMS Code Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuditRequest(BaseModel):
    code: str


class AuditResponse(BaseModel):
    analysis: str


class MetricsResponse(BaseModel):
    score: int
    time_complexity: str
    space_complexity: str


def query_local_engine(prompt: str, max_tokens: int) -> str:
    payload = {
        "prompt": prompt,
        "n_predict": max_tokens,
        "temperature": 0.1,
        "stop": ["<|im_end|>", "<|im_start|>"],
    }

    try:
        response = requests.post(LOCAL_LLM_URL, json=payload, timeout=120)
        response.raise_for_status()
        return response.json().get("content", "").strip()
    except requests.exceptions.RequestException as exc:
        raise HTTPException(
            status_code=500,
            detail="Local AI engine is offline. Please verify the llama server is available.",
        ) from exc


def query_groq_engine(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured for the code analytics service.",
        )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except requests.exceptions.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to reach the Groq API for code analytics.",
        ) from exc


def query_model(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    if AI_PROVIDER == "local":
        prompt = (
            "<|im_start|>system\n"
            f"{system_prompt}<|im_end|>\n"
            "<|im_start|>user\n"
            f"{user_prompt}<|im_end|>\n"
            "<|im_start|>assistant\n"
        )
        return query_local_engine(prompt, max_tokens=max_tokens)

    return query_groq_engine(system_prompt, user_prompt, max_tokens=max_tokens)


def parse_metrics_response(reply: str) -> dict[str, Any]:
    sanitized = reply.strip()

    if "```json" in sanitized:
        sanitized = sanitized.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in sanitized:
        sanitized = sanitized.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        return json.loads(sanitized)
    except Exception:
        return {"score": 50, "time_complexity": "O(n)", "space_complexity": "O(n)"}


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "code-analytics",
        "status": "ok",
        "provider": AI_PROVIDER,
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "service": "code-analytics",
        "status": "ok",
        "provider": AI_PROVIDER,
    }


@app.post("/api/audit", response_model=AuditResponse)
async def audit_code(request: AuditRequest) -> AuditResponse:
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    system_prompt = (
        "You are an expert code auditor. Analyze the code provided by the user. "
        "List the wrong things such as bugs, unsafe patterns, and weak design choices. "
        "Then provide best practices and concrete fixes."
    )
    user_prompt = f"Analyze this code:\n{request.code}"

    reply = query_model(system_prompt, user_prompt, max_tokens=700)
    return AuditResponse(analysis=reply)


@app.post("/api/analyze_metrics", response_model=MetricsResponse)
async def analyze_metrics(request: AuditRequest) -> MetricsResponse:
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    system_prompt = (
        "You are an expert code auditor. "
        "Reply strictly with a JSON object and no other text. "
        "The JSON must contain exactly these keys: "
        "'score' (integer from 0 to 100), "
        "'time_complexity' (string like O(n)), and "
        "'space_complexity' (string like O(1))."
    )
    user_prompt = f"Analyze this code:\n{request.code}"

    reply = query_model(system_prompt, user_prompt, max_tokens=180)
    data = parse_metrics_response(reply)

    return MetricsResponse(
        score=int(data.get("score", 50)),
        time_complexity=str(data.get("time_complexity", "O(n)")),
        space_complexity=str(data.get("space_complexity", "O(n)")),
    )


if __name__ == "__main__":
    print(f"Starting code analytics service on http://0.0.0.0:{PORT}")
    print(f"Provider: {AI_PROVIDER}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
