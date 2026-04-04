#!/usr/bin/env python3
"""
Additional LLM Integration Test for Midnight Scholar
Tests the LLM functionality more thoroughly to identify any issues.
"""

import requests
import json
import time

BASE_URL = "https://meaning-master-1.preview.emergentagent.com/api"

def test_llm_integration():
    """Test LLM integration more thoroughly"""
    print("🧠 Testing LLM Integration...")
    
    # First, import a text
    korean_text = "안녕하세요. 저는 학생입니다."
    payload = {
        "title": "LLM Test Text",
        "raw_text": korean_text
    }
    
    response = requests.post(f"{BASE_URL}/texts", json=payload)
    if response.status_code != 200:
        print(f"❌ Failed to import text: {response.status_code}")
        return False
    
    text_data = response.json()
    text_id = text_data["id"]
    print(f"✅ Text imported: {text_id}")
    
    # Get sentences
    response = requests.get(f"{BASE_URL}/texts/{text_id}/sentences")
    if response.status_code != 200:
        print(f"❌ Failed to get sentences: {response.status_code}")
        return False
    
    sentences = response.json()
    if not sentences:
        print("❌ No sentences found")
        return False
    
    sentence_id = sentences[0]["id"]
    print(f"✅ Got sentence: {sentence_id}")
    
    # Test sentence analysis (this uses LLM)
    print("🔍 Testing sentence analysis...")
    response = requests.post(f"{BASE_URL}/sentences/{sentence_id}/analyze")
    if response.status_code != 200:
        print(f"❌ Sentence analysis failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False
    
    analysis_data = response.json()
    print(f"✅ Analysis result: {analysis_data}")
    
    # Test answer evaluation (this also uses LLM)
    print("📝 Testing answer evaluation...")
    eval_payload = {
        "sentence_id": sentence_id,
        "user_answer": "Hello. I am a student.",
        "hint_level": 0
    }
    
    response = requests.post(f"{BASE_URL}/evaluate", json=eval_payload)
    if response.status_code != 200:
        print(f"❌ Answer evaluation failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False
    
    eval_data = response.json()
    print(f"✅ Evaluation result: {eval_data}")
    
    # Check if the evaluation makes sense
    if "score" in eval_data and "semantic_score" in eval_data:
        print(f"📊 Score: {eval_data['score']}, Semantic: {eval_data['semantic_score']}")
        return True
    else:
        print("❌ Evaluation response missing expected fields")
        return False

def main():
    print("🚀 Starting LLM Integration Test")
    print("=" * 50)
    
    success = test_llm_integration()
    
    print("=" * 50)
    if success:
        print("🎉 LLM Integration Test Passed!")
    else:
        print("⚠️ LLM Integration Test Failed!")
    
    return success

if __name__ == "__main__":
    main()