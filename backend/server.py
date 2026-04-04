from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class TextCreate(BaseModel):
    title: str
    raw_text: str

class TextResponse(BaseModel):
    id: str
    title: str
    sentence_count: int
    created_at: datetime

class SentenceResponse(BaseModel):
    id: str
    text_id: str
    sentence_ko: str
    order_index: int
    romanization: Optional[str] = None
    reference_meaning: Optional[str] = None
    key_points: List[str] = []
    difficulty_level: str = "A1"

class AnswerSubmit(BaseModel):
    sentence_id: str
    user_answer: str
    hint_level: int = 0

class EvaluationResult(BaseModel):
    score: int
    passed: bool
    missing_points: List[str]
    hint: str
    semantic_score: int
    concept_score: int
    points_earned: int

class UserStatsResponse(BaseModel):
    total_points: int = 0
    streak_count: int = 0
    sentences_completed: int = 0
    total_attempts: int = 0
    accuracy_percent: float = 0.0

class ProgressResponse(BaseModel):
    sentence_id: str
    attempts: int
    passed: bool
    best_score: int
    hints_used: int

# ==================== HELPER FUNCTIONS ====================

def split_korean_text(text: str) -> List[str]:
    """Split Korean text into sentences."""
    # Korean sentence endings
    sentences = re.split(r'(?<=[.!?。？！])\s*', text)
    # Filter out empty sentences and strip whitespace
    sentences = [s.strip() for s in sentences if s.strip()]
    return sentences

def romanize_korean(text: str) -> str:
    """Simple romanization placeholder - returns approximate pronunciation guide."""
    # This is a simplified version - in production you'd use a proper library
    # For now, we'll generate this via LLM during analysis
    return ""

def normalize_key_points(key_points) -> List[str]:
    """Convert key_points to list of strings, handling both dict and string formats."""
    if not key_points:
        return []
    
    normalized = []
    for point in key_points:
        if isinstance(point, dict):
            # Convert dict to string format
            term = point.get('term', '')
            meaning = point.get('meaning', '')
            grammar = point.get('grammar', '')
            if term and meaning:
                normalized.append(f"{term} ({meaning}) - {grammar}" if grammar else f"{term} ({meaning})")
            else:
                normalized.append(str(point))
        elif isinstance(point, str):
            normalized.append(point)
        else:
            normalized.append(str(point))
    
    return normalized

async def get_or_create_user_stats(user_id: str = "default_user"):
    """Get or create user stats."""
    stats = await db.user_stats.find_one({"user_id": user_id})
    if not stats:
        stats = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "total_points": 0,
            "streak_count": 0,
            "sentences_completed": 0,
            "total_attempts": 0,
            "accuracy_percent": 0.0,
            "last_activity": datetime.utcnow()
        }
        await db.user_stats.insert_one(stats)
    return stats

# ==================== LLM FUNCTIONS ====================

async def analyze_sentence_with_llm(sentence_ko: str) -> dict:
    """Use LLM to analyze a Korean sentence."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {
                "reference_meaning": "Translation not available",
                "romanization": "",
                "key_points": [],
                "difficulty_level": "A1"
            }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analyze_{uuid.uuid4()}",
            system_message="""You are a Korean language expert. Analyze Korean sentences and provide:
1. Natural English translation
2. Romanization (pronunciation guide)
3. Key vocabulary/grammar points (3-5 items as simple strings)
4. Difficulty level (A1, A2, B1, B2, C1)

Respond ONLY in valid JSON format with keys: reference_meaning, romanization, key_points (array of strings), difficulty_level

Example key_points format: ["오늘 (today) - noun", "날씨가 (weather) - noun + subject marker", "정말 (really) - adverb"]"""
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"Analyze this Korean sentence: {sentence_ko}"
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        import json
        # Try to extract JSON from response
        try:
            # Remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            
            result = json.loads(clean_response.strip())
            return result
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse LLM response as JSON: {response}")
            return {
                "reference_meaning": "Translation pending",
                "romanization": "",
                "key_points": [],
                "difficulty_level": "A1"
            }
    except Exception as e:
        logger.error(f"LLM analysis error: {e}")
        return {
            "reference_meaning": "Translation pending",
            "romanization": "",
            "key_points": [],
            "difficulty_level": "A1"
        }

async def evaluate_answer_with_llm(sentence_ko: str, reference_meaning: str, key_points: List[str], user_answer: str) -> dict:
    """Use LLM to evaluate user's translation answer."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"eval_{uuid.uuid4()}",
            system_message="""You are a Korean language teacher evaluating student translations.
Your task is to:
1. Compare the user's English translation to the reference meaning
2. Score semantic accuracy (0-100)
3. Identify missing key concepts
4. Provide a helpful hint WITHOUT revealing the full answer

Respond ONLY in valid JSON format with keys:
- semantic_score (number 0-100)
- missing_points (array of strings, what concepts are missing)
- hint (string, max 1 sentence, do NOT reveal full answer)

Be encouraging but accurate. Partial understanding should get partial credit."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Korean sentence: {sentence_ko}
Reference translation: {reference_meaning}
Key concepts to check: {', '.join(key_points) if key_points else 'N/A'}
Student's answer: {user_answer}

Evaluate the student's translation."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        import json
        try:
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            
            result = json.loads(clean_response.strip())
            return result
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse evaluation response: {response}")
            return {
                "semantic_score": 50,
                "missing_points": [],
                "hint": "Try to capture the main idea of the sentence."
            }
    except Exception as e:
        logger.error(f"LLM evaluation error: {e}")
        return {
            "semantic_score": 50,
            "missing_points": [],
            "hint": "Keep trying! Focus on the key words."
        }

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Midnight Scholar API", "version": "1.0.0"}

# ----- TEXT MANAGEMENT -----

@api_router.post("/texts", response_model=TextResponse)
async def import_text(text_input: TextCreate):
    """Import a Korean text and split into sentences."""
    text_id = str(uuid.uuid4())
    
    # Split text into sentences
    sentences = split_korean_text(text_input.raw_text)
    
    if not sentences:
        raise HTTPException(status_code=400, detail="No valid sentences found in text")
    
    # Save the text document
    text_doc = {
        "id": text_id,
        "title": text_input.title,
        "raw_text": text_input.raw_text,
        "sentence_count": len(sentences),
        "created_at": datetime.utcnow()
    }
    await db.texts.insert_one(text_doc)
    
    # Create sentence documents
    for idx, sentence_ko in enumerate(sentences):
        sentence_doc = {
            "id": str(uuid.uuid4()),
            "text_id": text_id,
            "sentence_ko": sentence_ko,
            "order_index": idx,
            "romanization": None,
            "reference_meaning": None,
            "key_points": [],
            "difficulty_level": "A1",
            "analyzed": False
        }
        await db.sentences.insert_one(sentence_doc)
    
    return TextResponse(
        id=text_id,
        title=text_input.title,
        sentence_count=len(sentences),
        created_at=text_doc["created_at"]
    )

@api_router.get("/texts", response_model=List[TextResponse])
async def get_texts():
    """Get all imported texts."""
    texts = await db.texts.find().sort("created_at", -1).to_list(100)
    return [TextResponse(
        id=t["id"],
        title=t["title"],
        sentence_count=t["sentence_count"],
        created_at=t["created_at"]
    ) for t in texts]

@api_router.delete("/texts/{text_id}")
async def delete_text(text_id: str):
    """Delete a text and all its sentences."""
    await db.texts.delete_one({"id": text_id})
    await db.sentences.delete_many({"text_id": text_id})
    await db.user_progress.delete_many({"text_id": text_id})
    return {"message": "Text deleted successfully"}

# ----- SENTENCES -----

@api_router.get("/texts/{text_id}/sentences", response_model=List[SentenceResponse])
async def get_sentences(text_id: str):
    """Get all sentences for a text."""
    sentences = await db.sentences.find({"text_id": text_id}).sort("order_index", 1).to_list(1000)
    return [SentenceResponse(
        id=s["id"],
        text_id=s["text_id"],
        sentence_ko=s["sentence_ko"],
        order_index=s["order_index"],
        romanization=s.get("romanization"),
        reference_meaning=s.get("reference_meaning"),
        key_points=normalize_key_points(s.get("key_points", [])),
        difficulty_level=s.get("difficulty_level", "A1")
    ) for s in sentences]

@api_router.get("/sentences/{sentence_id}", response_model=SentenceResponse)
async def get_sentence(sentence_id: str):
    """Get a single sentence by ID."""
    sentence = await db.sentences.find_one({"id": sentence_id})
    if not sentence:
        raise HTTPException(status_code=404, detail="Sentence not found")
    return SentenceResponse(
        id=sentence["id"],
        text_id=sentence["text_id"],
        sentence_ko=sentence["sentence_ko"],
        order_index=sentence["order_index"],
        romanization=sentence.get("romanization"),
        reference_meaning=sentence.get("reference_meaning"),
        key_points=normalize_key_points(sentence.get("key_points", [])),
        difficulty_level=sentence.get("difficulty_level", "A1")
    )

@api_router.post("/sentences/{sentence_id}/analyze")
async def analyze_sentence(sentence_id: str):
    """Analyze a sentence with LLM (get translation, romanization, key points)."""
    sentence = await db.sentences.find_one({"id": sentence_id})
    if not sentence:
        raise HTTPException(status_code=404, detail="Sentence not found")
    
    # Check if already analyzed
    if sentence.get("analyzed") and sentence.get("reference_meaning"):
        return {
            "message": "Sentence already analyzed",
            "data": {
                "reference_meaning": sentence["reference_meaning"],
                "romanization": sentence.get("romanization", ""),
                "key_points": sentence.get("key_points", []),
                "difficulty_level": sentence.get("difficulty_level", "A1")
            }
        }
    
    # Analyze with LLM
    analysis = await analyze_sentence_with_llm(sentence["sentence_ko"])
    
    # Update sentence in database
    await db.sentences.update_one(
        {"id": sentence_id},
        {"$set": {
            "reference_meaning": analysis.get("reference_meaning", ""),
            "romanization": analysis.get("romanization", ""),
            "key_points": analysis.get("key_points", []),
            "difficulty_level": analysis.get("difficulty_level", "A1"),
            "analyzed": True
        }}
    )
    
    return {"message": "Sentence analyzed", "data": analysis}

# ----- ANSWER EVALUATION -----

@api_router.post("/evaluate", response_model=EvaluationResult)
async def evaluate_answer(submission: AnswerSubmit):
    """Evaluate user's translation answer."""
    # Get sentence
    sentence = await db.sentences.find_one({"id": submission.sentence_id})
    if not sentence:
        raise HTTPException(status_code=404, detail="Sentence not found")
    
    # Ensure sentence is analyzed
    if not sentence.get("reference_meaning"):
        analysis = await analyze_sentence_with_llm(sentence["sentence_ko"])
        await db.sentences.update_one(
            {"id": submission.sentence_id},
            {"$set": {
                "reference_meaning": analysis.get("reference_meaning", ""),
                "romanization": analysis.get("romanization", ""),
                "key_points": analysis.get("key_points", []),
                "difficulty_level": analysis.get("difficulty_level", "A1"),
                "analyzed": True
            }}
        )
        sentence["reference_meaning"] = analysis.get("reference_meaning", "")
        sentence["key_points"] = analysis.get("key_points", [])
    
    # Evaluate with LLM
    eval_result = await evaluate_answer_with_llm(
        sentence["sentence_ko"],
        sentence.get("reference_meaning", ""),
        sentence.get("key_points", []),
        submission.user_answer
    )
    
    semantic_score = eval_result.get("semantic_score", 50)
    missing_points = eval_result.get("missing_points", [])
    hint = eval_result.get("hint", "Keep practicing!")
    
    # Calculate concept coverage score
    key_points = sentence.get("key_points", [])
    if key_points:
        covered = len(key_points) - len(missing_points)
        concept_score = int((covered / len(key_points)) * 100) if key_points else 100
    else:
        concept_score = semantic_score  # No key points, use semantic score
    
    # Hybrid score: 65% semantic + 35% concept
    final_score = int(0.65 * semantic_score + 0.35 * concept_score)
    passed = final_score >= 80
    
    # Calculate points earned
    # Get current progress for this sentence
    progress = await db.user_progress.find_one({
        "sentence_id": submission.sentence_id,
        "user_id": "default_user"
    })
    
    attempts = (progress.get("attempts", 0) if progress else 0) + 1
    hints_used = submission.hint_level
    
    # Point calculation based on performance
    if passed:
        if attempts == 1 and hints_used == 0:
            points_earned = 100  # Perfect first try
        elif attempts == 1:
            points_earned = 75 - (hints_used * 15)  # First try with hints
        elif attempts <= 3:
            points_earned = 50 - (hints_used * 10)  # Multiple attempts
        else:
            points_earned = 25  # Many attempts
        points_earned = max(points_earned, 10)  # Minimum points for passing
    else:
        points_earned = 0
    
    # Update progress
    if progress:
        update_data = {
            "attempts": attempts,
            "hints_used": max(progress.get("hints_used", 0), hints_used),
            "last_attempt": datetime.utcnow()
        }
        if passed and not progress.get("passed"):
            update_data["passed"] = True
            update_data["best_score"] = final_score
        elif final_score > progress.get("best_score", 0):
            update_data["best_score"] = final_score
        
        await db.user_progress.update_one(
            {"_id": progress["_id"]},
            {"$set": update_data}
        )
    else:
        await db.user_progress.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": "default_user",
            "sentence_id": submission.sentence_id,
            "text_id": sentence["text_id"],
            "attempts": 1,
            "passed": passed,
            "best_score": final_score,
            "hints_used": hints_used,
            "last_attempt": datetime.utcnow()
        })
    
    # Update user stats if passed (only add points once per sentence)
    if passed and (not progress or not progress.get("passed")):
        await db.user_stats.update_one(
            {"user_id": "default_user"},
            {
                "$inc": {
                    "total_points": points_earned,
                    "sentences_completed": 1
                },
                "$set": {"last_activity": datetime.utcnow()}
            },
            upsert=True
        )
    
    # Update total attempts
    await db.user_stats.update_one(
        {"user_id": "default_user"},
        {
            "$inc": {"total_attempts": 1},
            "$set": {"last_activity": datetime.utcnow()}
        },
        upsert=True
    )
    
    return EvaluationResult(
        score=final_score,
        passed=passed,
        missing_points=missing_points,
        hint=hint,
        semantic_score=semantic_score,
        concept_score=concept_score,
        points_earned=points_earned if passed else 0
    )

# ----- USER STATS -----

@api_router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats():
    """Get user statistics."""
    stats = await get_or_create_user_stats("default_user")
    
    # Calculate accuracy
    total_attempts = stats.get("total_attempts", 0)
    sentences_completed = stats.get("sentences_completed", 0)
    accuracy = (sentences_completed / total_attempts * 100) if total_attempts > 0 else 0
    
    return UserStatsResponse(
        total_points=stats.get("total_points", 0),
        streak_count=stats.get("streak_count", 0),
        sentences_completed=sentences_completed,
        total_attempts=total_attempts,
        accuracy_percent=round(accuracy, 1)
    )

@api_router.post("/stats/add-points")
async def add_game_points(points: int):
    """Add points from mini-game."""
    await db.user_stats.update_one(
        {"user_id": "default_user"},
        {
            "$inc": {"total_points": points},
            "$set": {"last_activity": datetime.utcnow()}
        },
        upsert=True
    )
    stats = await get_or_create_user_stats("default_user")
    return {"total_points": stats.get("total_points", 0)}

@api_router.get("/progress/{text_id}", response_model=List[ProgressResponse])
async def get_text_progress(text_id: str):
    """Get progress for all sentences in a text."""
    progress_list = await db.user_progress.find({
        "text_id": text_id,
        "user_id": "default_user"
    }).to_list(1000)
    
    return [ProgressResponse(
        sentence_id=p["sentence_id"],
        attempts=p.get("attempts", 0),
        passed=p.get("passed", False),
        best_score=p.get("best_score", 0),
        hints_used=p.get("hints_used", 0)
    ) for p in progress_list]

# ----- WORD TRANSLATION -----

class WordTranslateRequest(BaseModel):
    word: str

@api_router.post("/translate-word")
async def translate_word(request: WordTranslateRequest):
    """Translate a single Korean word."""
    word = request.word
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"word": word, "translation": "Translation unavailable", "romanization": ""}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"word_{uuid.uuid4()}",
            system_message="""You are a Korean-English translator. Translate the given Korean word/phrase.
Respond ONLY in valid JSON format with keys: translation (English meaning), romanization (pronunciation), part_of_speech (noun/verb/adjective/etc)"""
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=f"Translate this Korean word: {word}")
        response = await chat.send_message(user_message)
        
        import json
        try:
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            
            result = json.loads(clean_response.strip())
            return {
                "word": word,
                "translation": result.get("translation", "Unknown"),
                "romanization": result.get("romanization", ""),
                "part_of_speech": result.get("part_of_speech", "")
            }
        except json.JSONDecodeError:
            return {"word": word, "translation": response.strip()[:50], "romanization": ""}
    except Exception as e:
        logger.error(f"Word translation error: {e}")
        return {"word": word, "translation": "Translation error", "romanization": ""}

# ----- HINTS -----

@api_router.get("/hints/{sentence_id}/{level}")
async def get_hint(sentence_id: str, level: int):
    """Get a progressive hint for a sentence."""
    sentence = await db.sentences.find_one({"id": sentence_id})
    if not sentence:
        raise HTTPException(status_code=404, detail="Sentence not found")
    
    # Ensure analyzed
    if not sentence.get("reference_meaning"):
        await analyze_sentence(sentence_id)
        sentence = await db.sentences.find_one({"id": sentence_id})
    
    key_points = sentence.get("key_points", [])
    reference = sentence.get("reference_meaning", "")
    
    if level == 1:
        hint = "Focus on the verb ending and sentence structure."
    elif level == 2:
        if key_points:
            hint = f"Key grammar/vocabulary: {key_points[0] if key_points else 'Focus on the main verb'}"
        else:
            hint = "Try to identify the subject and main action."
    elif level == 3:
        # Give partial structure without full answer
        words = reference.split()
        if len(words) > 4:
            hint = f"The sentence structure is: {words[0]} ... {words[-1]}"
        else:
            hint = f"The meaning involves: {words[0]}..." if words else "Keep trying!"
    else:
        hint = reference  # Final hint reveals answer
    
    return {"level": level, "hint": hint}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
