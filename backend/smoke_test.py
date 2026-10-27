#!/usr/bin/env python3
"""
Gemma 4 smoke test script for StudySpark AI.
Tests live inference in English and Hindi using google-genai SDK.
Only runs if GEMINI_API_KEY is configured in backend/.env or environment.
"""

import os
import sys
import time

# Force UTF-8 output on Windows to support Devanagari text
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Graceful fallback if python-dotenv is not installed
    if os.path.exists(".env"):
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k.strip() not in os.environ:
                        os.environ[k.strip()] = v.strip()

API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL_ID = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it").strip()


def run_smoke_test():
    print("=" * 60)
    print("StudySpark AI - Gemma 4 Model Smoke Test")
    print(f"Model ID: {MODEL_ID}")
    print("=" * 60)

    if not API_KEY:
        print("\n[STATUS: BLOCKED]")
        print("GEMINI_API_KEY is missing or empty in backend/.env / environment.")
        print("Live inference test cannot run without credentials.")
        print("Please copy backend/.env.example to backend/.env and set your GEMINI_API_KEY.")
        sys.exit(2)

    try:
        from google import genai
    except ImportError:
        print("\n[ERROR] 'google-genai' SDK is not installed.")
        print("Run: pip install -r requirements.txt")
        sys.exit(1)

    print("\nConnecting to Gemini API via google-genai SDK...")
    client = genai.Client(api_key=API_KEY)

    # Test 1: English Prompt
    en_prompt = "Explain what Ohm's law is in 2 short sentences for a student. Do not use markdown."
    print("\n--- Test 1: English Inference ---")
    print(f"Prompt: {en_prompt}")
    t0 = time.perf_counter()
    try:
        res_en = client.models.generate_content(
            model=MODEL_ID,
            contents=en_prompt,
        )
        latency_en = (time.perf_counter() - t0) * 1000
        print(f"Response ({latency_en:.1f} ms):\n{res_en.text.strip()}\n")
    except Exception as e:
        print(f"English test failed: {e}")
        sys.exit(1)

    # Test 2: Hindi Prompt
    hi_prompt = "ओह्म का नियम (Ohm's law) क्या है? 2 छोटे वाक्यों में समझाएं। No markdown."
    print("--- Test 2: Hindi Inference ---")
    print(f"Prompt: {hi_prompt}")
    t0 = time.perf_counter()
    try:
        res_hi = client.models.generate_content(
            model=MODEL_ID,
            contents=hi_prompt,
        )
        latency_hi = (time.perf_counter() - t0) * 1000
        print(f"Response ({latency_hi:.1f} ms):\n{res_hi.text.strip()}\n")
    except Exception as e:
        print(f"Hindi test failed: {e}")
        sys.exit(1)

    print("=" * 60)
    print("Gate 0 Verification: SUCCESS! English and Hindi live inference verified.")
    print("=" * 60)


if __name__ == "__main__":
    run_smoke_test()
