from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import requests
import json
from fastapi.middleware.cors import CORSMiddleware

LLAMA_SERVER_URL = "http://127.0.0.1:8080/completion"

app = FastAPI(title="Qwen Code Auditor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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

def query_gguf_engine(prompt: str, max_tokens: int) -> str:
    """Sends the prompt to the local C++ llama-server engine"""
    payload = {
        "prompt": prompt,
        "n_predict": max_tokens,
        "temperature": 0.1,
        "stop": ["<|im_end|>", "<|im_start|>"]
    }
    
    try:
        response = requests.post(LLAMA_SERVER_URL, json=payload, timeout=120)
        response.raise_for_status()
        return response.json().get("content", "").strip()
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=500, detail="AI Engine is offline. Please make sure llama-server.exe is running!")

@app.post("/api/audit", response_model=AuditResponse)
async def audit_code(request: AuditRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""<|im_start|>system
You are an expert code auditor. Analyze the code provided by the user.
List the 'Wrong Things' (bugs, anti-patterns) and then provide 'Best Practices' (fixes).<|im_end|>
<|im_start|>user
Analyze this code:
{request.code}<|im_end|>
<|im_start|>assistant
"""

    reply = query_gguf_engine(prompt, max_tokens=512)
    return AuditResponse(analysis=reply)

@app.post("/api/analyze_metrics", response_model=MetricsResponse)
async def analyze_metrics(request: AuditRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""<|im_start|>system
You are an expert code auditor. Analyze the code provided by the user.
You MUST reply strictly with a JSON object. No other text. The JSON object must contain exactly three keys: 'score' (an integer from 0 to 100 representing code quality), 'time_complexity' (a string like 'O(n)'), and 'space_complexity' (a string like 'O(1)').<|im_end|>
<|im_start|>user
Analyze this code:
{request.code}<|im_end|>
<|im_start|>assistant
"""
    
    reply = query_gguf_engine(prompt, max_tokens=150)
    
    try:
        if "```json" in reply:
            reply = reply.split("```json")[1].split("```")[0].strip()
        elif "```" in reply:
            reply = reply.split("```")[1].split("```")[0].strip()
            
        data = json.loads(reply)
        return MetricsResponse(
            score=data.get("score", 70),
            time_complexity=data.get("time_complexity", "O(unknown)"),
            space_complexity=data.get("space_complexity", "O(unknown)")
        )
    except Exception as e:
        print(f"Failed to parse JSON: {reply}")
        return MetricsResponse(score=50, time_complexity="O(n)", space_complexity="O(n)")

if __name__ == "__main__":
    print("Starting lightweight proxy server on http://localhost:8000")
    print("Ensure llama-server.exe is running in a separate terminal on port 8080!")
    uvicorn.run(app, host="0.0.0.0", port=8000)