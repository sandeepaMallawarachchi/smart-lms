"""
Download Llama 3.2 3B model
Run this once: python download_model.py
"""

from huggingface_hub import hf_hub_download
import os

MODEL_DIR = "models/llm"
os.makedirs(MODEL_DIR, exist_ok=True)

print("Downloading Llama 3.2 3B (GGUF format - optimized for CPU)...")
print("This will download ~2GB. Please wait...")

model_path = hf_hub_download(
    repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",
    filename="Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    local_dir=MODEL_DIR
)

print(f"\nModel downloaded successfully to: {model_path}")
print("You can now run the API!")