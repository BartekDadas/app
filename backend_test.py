#!/usr/bin/env python3
"""
Backend API Testing for Midnight Scholar Korean Learning App
Tests all API endpoints as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Use the production URL from frontend/.env
BASE_URL = "https://meaning-master-1.preview.emergentagent.com/api"

class MidnightScholarAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.text_id = None
        self.sentence_id = None
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_api_health(self):
        """Test 1: Basic API health check - GET /api/"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Midnight Scholar" in data["message"]:
                    self.log_result("API Health Check", True, f"API is healthy: {data['message']}")
                    return True
                else:
                    self.log_result("API Health Check", False, "Unexpected response format", data)
                    return False
            else:
                self.log_result("API Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_text_import(self):
        """Test 2: Import Korean text - POST /api/texts"""
        try:
            korean_text = "오늘 날씨가 정말 좋아요. 산책하러 갈까요? 점심은 뭘 먹을까요?"
            payload = {
                "title": "Test Korean Text",
                "raw_text": korean_text
            }
            
            response = self.session.post(
                f"{self.base_url}/texts",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "sentence_count" in data:
                    self.text_id = data["id"]  # Store for later tests
                    self.log_result("Text Import", True, 
                                  f"Text imported successfully. ID: {data['id']}, Sentences: {data['sentence_count']}")
                    return True
                else:
                    self.log_result("Text Import", False, "Missing required fields in response", data)
                    return False
            else:
                self.log_result("Text Import", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Text Import", False, f"Request error: {str(e)}")
            return False

    def test_get_all_texts(self):
        """Test 3: Get all texts - GET /api/texts"""
        try:
            response = self.session.get(f"{self.base_url}/texts")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0 and self.text_id:
                        # Check if our imported text is in the list
                        found = any(text.get("id") == self.text_id for text in data)
                        if found:
                            self.log_result("Get All Texts", True, f"Found {len(data)} texts including our imported text")
                            return True
                        else:
                            self.log_result("Get All Texts", False, "Imported text not found in list", data)
                            return False
                    else:
                        self.log_result("Get All Texts", True, f"Retrieved {len(data)} texts (empty list is valid)")
                        return True
                else:
                    self.log_result("Get All Texts", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get All Texts", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get All Texts", False, f"Request error: {str(e)}")
            return False

    def test_get_sentences(self):
        """Test 4: Get sentences for text - GET /api/texts/{text_id}/sentences"""
        if not self.text_id:
            self.log_result("Get Sentences", False, "No text_id available from previous test")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/texts/{self.text_id}/sentences")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Store first sentence ID for later tests
                    self.sentence_id = data[0].get("id")
                    sentence_count = len(data)
                    self.log_result("Get Sentences", True, 
                                  f"Retrieved {sentence_count} sentences. First sentence ID: {self.sentence_id}")
                    return True
                else:
                    self.log_result("Get Sentences", False, "No sentences found or invalid format", data)
                    return False
            else:
                self.log_result("Get Sentences", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Sentences", False, f"Request error: {str(e)}")
            return False

    def test_sentence_analysis(self):
        """Test 5: Analyze sentence - POST /api/sentences/{sentence_id}/analyze"""
        if not self.sentence_id:
            self.log_result("Sentence Analysis", False, "No sentence_id available from previous test")
            return False
            
        try:
            response = self.session.post(f"{self.base_url}/sentences/{self.sentence_id}/analyze")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "data" in data:
                    analysis_data = data["data"]
                    if "reference_meaning" in analysis_data:
                        self.log_result("Sentence Analysis", True, 
                                      f"Sentence analyzed: {analysis_data.get('reference_meaning', 'N/A')}")
                        return True
                    else:
                        self.log_result("Sentence Analysis", False, "Missing reference_meaning in analysis", data)
                        return False
                else:
                    self.log_result("Sentence Analysis", False, "Unexpected response format", data)
                    return False
            else:
                self.log_result("Sentence Analysis", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Sentence Analysis", False, f"Request error: {str(e)}")
            return False

    def test_answer_evaluation(self):
        """Test 6: Evaluate answer - POST /api/evaluate"""
        if not self.sentence_id:
            self.log_result("Answer Evaluation", False, "No sentence_id available from previous test")
            return False
            
        try:
            payload = {
                "sentence_id": self.sentence_id,
                "user_answer": "The weather is really nice today",
                "hint_level": 0
            }
            
            response = self.session.post(
                f"{self.base_url}/evaluate",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["score", "passed", "missing_points", "hint", "semantic_score", "concept_score", "points_earned"]
                if all(field in data for field in required_fields):
                    self.log_result("Answer Evaluation", True, 
                                  f"Answer evaluated. Score: {data['score']}, Passed: {data['passed']}, Points: {data['points_earned']}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Answer Evaluation", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Answer Evaluation", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Answer Evaluation", False, f"Request error: {str(e)}")
            return False

    def test_get_hints(self):
        """Test 7: Get hints - GET /api/hints/{sentence_id}/1"""
        if not self.sentence_id:
            self.log_result("Get Hints", False, "No sentence_id available from previous test")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/hints/{self.sentence_id}/1")
            
            if response.status_code == 200:
                data = response.json()
                if "level" in data and "hint" in data:
                    self.log_result("Get Hints", True, 
                                  f"Hint retrieved. Level: {data['level']}, Hint: {data['hint']}")
                    return True
                else:
                    self.log_result("Get Hints", False, "Missing level or hint in response", data)
                    return False
            else:
                self.log_result("Get Hints", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Hints", False, f"Request error: {str(e)}")
            return False

    def test_user_stats(self):
        """Test 8: Get user stats - GET /api/stats"""
        try:
            response = self.session.get(f"{self.base_url}/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_points", "streak_count", "sentences_completed", "total_attempts", "accuracy_percent"]
                if all(field in data for field in required_fields):
                    self.log_result("User Stats", True, 
                                  f"Stats retrieved. Points: {data['total_points']}, Completed: {data['sentences_completed']}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("User Stats", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("User Stats", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("User Stats", False, f"Request error: {str(e)}")
            return False

    def test_add_game_points(self):
        """Test 9: Add game points - POST /api/stats/add-points?points=50"""
        try:
            response = self.session.post(f"{self.base_url}/stats/add-points?points=50")
            
            if response.status_code == 200:
                data = response.json()
                if "total_points" in data:
                    self.log_result("Add Game Points", True, 
                                  f"Points added successfully. Total points: {data['total_points']}")
                    return True
                else:
                    self.log_result("Add Game Points", False, "Missing total_points in response", data)
                    return False
            else:
                self.log_result("Add Game Points", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Add Game Points", False, f"Request error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🚀 Starting Midnight Scholar API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_api_health,
            self.test_text_import,
            self.test_get_all_texts,
            self.test_get_sentences,
            self.test_sentence_analysis,
            self.test_answer_evaluation,
            self.test_get_hints,
            self.test_user_stats,
            self.test_add_game_points
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed")
            return False

    def print_detailed_results(self):
        """Print detailed test results"""
        print("\n📋 Detailed Test Results:")
        print("=" * 60)
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")
            if not result["success"] and "response_data" in result:
                print(f"   Response: {result['response_data']}")
            print()

def main():
    """Main test execution"""
    tester = MidnightScholarAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_detailed_results()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()