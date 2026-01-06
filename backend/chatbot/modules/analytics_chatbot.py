from sentence_transformers import SentenceTransformer
import numpy as np
from pymongo import MongoClient
from bson import ObjectId
import os
import requests
from datetime import datetime

class AnalyticsChatbot:
    def __init__(self):
        print("Loading Analytics module...")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        MONGO_URI = os.getenv('MONGODB_URI')
        self.client = MongoClient(MONGO_URI)
        self.db = self.client['test']
        self.ML_API_URL = os.getenv('ML_API_URL', 'http://localhost:5000')
        self.GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
        self.GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
        
        self.INTENTS = {
            "risk_prediction": ["risk", "failing", "fail", "at risk", "danger", "academic risk", "prediction"],
            "performance_view": ["performance", "grades", "scores", "marks", "gpa", "results"],
            "recommendations": ["recommend", "suggestion", "improve", "help", "advice", "study tips"],
            "engagement_metrics": ["engagement", "participation", "activity", "involvement", "progress"],
            "trend_analysis": ["trend", "pattern", "over time", "history", "historical", "timeline"],
            "course_performance": ["course", "module", "subject", "class performance"],
            "comparison": ["compare", "comparison", "versus", "vs", "other students", "average"]
        }
    
    def classify_intent(self, user_query):
        query_embedding = self.sentence_model.encode(user_query.lower())
        best_intent = None
        best_score = 0
        
        for intent, keywords in self.INTENTS.items():
            for keyword in keywords:
                keyword_embedding = self.sentence_model.encode(keyword)
                similarity = np.dot(query_embedding, keyword_embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(keyword_embedding)
                )
                if similarity > best_score:
                    best_score = similarity
                    best_intent = intent
        
        return best_intent if best_score > 0.5 else "general_analytics"
    
    def get_student_data(self, student_id):
        student = self.db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return None
        
        year = int(student.get('academicYear') or student.get('year', 1))
        semester = int(student.get('semester', 1))
        specialization = student.get('specialization', '')
        
        courses = list(self.db.courses.find({
            "year": year,
            "semester": semester,
            "specializations": specialization
        }))
        
        return {
            'student': student,
            'courses': courses,
            'year': year,
            'semester': semester,
            'specialization': specialization
        }
    
    def get_risk_prediction(self, student_id):
        try:
            student = self.db.students.find_one({"_id": ObjectId(student_id)})
            if not student:
                return {'error': 'Student not found', 'fallback': True}
            
            # Calculate age and age band
            from datetime import datetime as dt
            if 'dateOfBirth' in student:
                dob = student['dateOfBirth']
                if isinstance(dob, str):
                    birth_date = dt.fromisoformat(dob.replace('Z', '+00:00'))
                else:
                    birth_date = dob
                age = (dt.now() - birth_date).days // 365
                if age <= 35:
                    age_band = '0-35'
                elif age <= 55:
                    age_band = '35-55'
                else:
                    age_band = '55<='
            else:
                age_band = '0-35'
            
            # Convert gender
            gender_map = {'male': 'M', 'female': 'F', 'other': 'O'}
            gender = gender_map.get(student.get('gender', 'male').lower(), 'M')
            
            # Get the latest prediction from database
            latest_prediction = self.db.predictions.find_one(
                {"studentId": student_id},
                sort=[("createdAt", -1)]
            )
            
            # Build prediction payload
            if latest_prediction and 'inputData' in latest_prediction:
                payload = latest_prediction['inputData']
                payload['student_id'] = student.get('studentIdNumber', student_id)
            else:
                payload = {
                    "student_id": student.get('studentIdNumber', student_id),
                    "total_clicks": 5000,
                    "avg_clicks_per_day": 50,
                    "clicks_std": 25,
                    "max_clicks_single_day": 150,
                    "days_active": 100,
                    "study_span_days": 120,
                    "engagement_regularity": 0.5,
                    "pre_course_clicks": 200,
                    "avg_score": 75,
                    "score_std": 10,
                    "min_score": 60,
                    "max_score": 90,
                    "completion_rate": 0.9,
                    "first_score": 70,
                    "score_improvement": 20,
                    "avg_days_early": 2,
                    "timing_consistency": 3,
                    "worst_delay": -1,
                    "late_submission_count": 1,
                    "num_of_prev_attempts": 0,
                    "studied_credits": 60,
                    "early_registration": 1,
                    "withdrew": 0,
                    "gender": gender,
                    "age_band": age_band,
                    "highest_education": "A Level or Equivalent",
                    "disability": "N"
                }
            
            print(f"Calling ML API with payload: {payload}")
            
            response = requests.post(
                f"{self.ML_API_URL}/api/predict",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"ML API Response: {result}")
                
                if 'prediction' in result:
                    pred = result['prediction']
                    return {
                        'risk_category': pred.get('risk_level', 'UNKNOWN'),
                        'risk_score': pred.get('risk_probability', 0),
                        'confidence': pred.get('confidence', 0)
                    }
                else:
                    return result
            else:
                print(f"ML API returned status {response.status_code}")
                return {'error': 'Could not fetch prediction', 'status_code': response.status_code}
        except Exception as e:
            print(f"ML API Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'error': str(e), 'fallback': True}
    
    def get_stored_predictions(self, student_id):
        predictions = list(self.db.predictions.find({"studentId": student_id}).sort("createdAt", -1).limit(5))
        return predictions
    
    def generate_recommendations(self, student_id, prediction_data, student_context):
        try:
            risk_level = prediction_data.get('risk_category', 'UNKNOWN')
            risk_score = prediction_data.get('risk_score', 0)
            
            prompt = f"""You are an academic advisor AI helping a university student improve their performance.

Student Context:
- Year: {student_context.get('year', 'N/A')}
- Semester: {student_context.get('semester', 'N/A')}
- Specialization: {student_context.get('specialization', 'N/A')}
- Risk Level: {risk_level}
- Risk Score: {risk_score:.2f}

Based on this information, provide 3-5 personalized, actionable study recommendations to help this student improve their academic performance. Be specific and practical.

Format your response as a numbered list with clear, concise points."""

            headers = {
                "Authorization": f"Bearer {self.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": "You are a helpful academic advisor providing personalized study recommendations."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 500
            }
            
            response = requests.post(self.GROQ_API_URL, headers=headers, json=payload, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                return self._fallback_recommendations(risk_level)
        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            return self._fallback_recommendations(risk_level)
    
    def _fallback_recommendations(self, risk_level):
        if risk_level == "HIGH":
            return """**Personalized Recommendations:**

1. **Seek Academic Support:** Meet with your course instructors during office hours to discuss challenging topics
2. **Form Study Groups:** Connect with classmates to collaborate on assignments and review materials together
3. **Create a Study Schedule:** Dedicate specific time blocks each day for focused study sessions
4. **Use Campus Resources:** Visit the academic support center for tutoring and study skills workshops
5. **Break Down Tasks:** Divide large assignments into smaller, manageable tasks with interim deadlines"""
        elif risk_level == "MEDIUM":
            return """**Personalized Recommendations:**

1. **Review Course Materials:** Regularly review lecture notes and readings within 24 hours of class
2. **Practice Active Learning:** Solve practice problems and quiz yourself on key concepts
3. **Maintain Consistency:** Keep up with assignments and avoid procrastination
4. **Ask Questions:** Don't hesitate to ask for clarification on topics you find difficult
5. **Track Your Progress:** Monitor your grades and identify areas needing improvement"""
        else:
            return """**Personalized Recommendations:**

1. **Maintain Your Momentum:** Continue your current study habits that are working well
2. **Help Others:** Consider tutoring peers, which reinforces your own understanding
3. **Explore Advanced Topics:** Challenge yourself with supplementary materials and projects
4. **Balance Your Workload:** Ensure you're managing time effectively across all courses
5. **Set Higher Goals:** Push yourself to achieve even better results in upcoming assessments"""
    
    def format_risk_response(self, prediction_data, student_context):
        risk_level = prediction_data.get('risk_category', 'UNKNOWN')
        risk_score = prediction_data.get('risk_score', 0)
        confidence = prediction_data.get('confidence', 0)
        
        risk_emoji = {'HIGH': '🔴', 'MEDIUM': '🟡', 'LOW': '🟢', 'UNKNOWN': '⚪'}
        emoji = risk_emoji.get(risk_level.upper(), '⚪')
        
        # Convert to percentages if needed
        risk_score_percent = risk_score * 100 if risk_score <= 1 else risk_score
        confidence_percent = confidence * 100 if confidence <= 1 else confidence
        
        response = f"""**📊 Your Academic Risk Assessment**

{emoji} **Risk Level:** {risk_level.upper()}
**Risk Score:** {risk_score_percent:.1f}%
**Prediction Confidence:** {confidence_percent:.1f}%

"""
        
        if risk_level.upper() == "HIGH":
            response += "⚠️ You're currently at high academic risk. It's important to take action now to improve your performance.\n\n"
        elif risk_level.upper() == "MEDIUM":
            response += "⚡ You're showing some warning signs. With some adjustments, you can improve your academic standing.\n\n"
        else:
            response += "✅ You're performing well! Keep up the good work and continue your current study habits.\n\n"
        
        return response
    
    def get_engagement_metrics(self, student_id):
        project_progress = list(self.db.studentprojectprogresses.find({"studentId": student_id}))
        task_progress = list(self.db.studenttaskprogresses.find({"studentId": student_id}))
        
        total_activities = len(project_progress) + len(task_progress)
        completed = sum(1 for p in project_progress + task_progress if p.get('status') == 'done')
        in_progress = sum(1 for p in project_progress + task_progress if p.get('status') == 'inprogress')
        
        completion_rate = (completed / total_activities * 100) if total_activities > 0 else 0
        
        response = f"""**📈 Your Engagement Metrics**

**Activity Overview:**
- Total Activities: {total_activities}
- Completed: {completed}
- In Progress: {in_progress}
- Completion Rate: {completion_rate:.1f}%

"""
        
        if completion_rate >= 80:
            response += "🌟 Excellent engagement! You're actively participating in your coursework.\n"
        elif completion_rate >= 60:
            response += "👍 Good engagement level. Consider completing more pending tasks.\n"
        else:
            response += "⚠️ Low engagement detected. Try to complete more activities to improve your performance.\n"
        
        return response
    
    def handle_query(self, user_query, student_id):
        intent = self.classify_intent(user_query)
        student_data = self.get_student_data(student_id)
        
        if not student_data:
            return {'response': "I couldn't find your student profile. Please make sure you're logged in correctly.", 'intent': 'error', 'module': 'learning_analytics'}
        
        if intent == "risk_prediction":
            prediction = self.get_risk_prediction(student_id)
            if 'error' in prediction:
                stored_predictions = self.get_stored_predictions(student_id)
                prediction = stored_predictions[0] if stored_predictions else {}
            response = self.format_risk_response(prediction, student_data)
        elif intent == "recommendations":
            prediction = self.get_risk_prediction(student_id)
            if 'error' in prediction:
                stored_predictions = self.get_stored_predictions(student_id)
                prediction = stored_predictions[0] if stored_predictions else {}
            response = self.generate_recommendations(student_id, prediction, student_data)
        elif intent == "engagement_metrics":
            response = self.get_engagement_metrics(student_id)
        elif intent == "performance_view":
            prediction = self.get_risk_prediction(student_id)
            if 'error' not in prediction:
                response = self.format_risk_response(prediction, student_data)
                response += "\n\n" + self.get_engagement_metrics(student_id)
            else:
                response = self.get_engagement_metrics(student_id)
        else:
            response = """**📊 Learning Analytics Support**

I can help you with:
1. **Risk Prediction** - View your academic risk assessment
2. **Performance Metrics** - See your overall academic performance
3. **Personalized Recommendations** - Get study tips tailored to your situation
4. **Engagement Analysis** - Track your participation and activity levels

What would you like to know about?"""
        
        return {'response': response, 'intent': intent, 'module': 'learning_analytics'}
    
    def get_predictions(self, student_id):
        try:
            prediction = self.get_risk_prediction(student_id)
            student_data = self.get_student_data(student_id)
            return {'prediction': prediction, 'student_context': student_data, 'timestamp': datetime.now().isoformat()}
        except Exception as e:
            return {'error': str(e)}
    
    def test_connection(self, student_id):
        try:
            student_data = self.get_student_data(student_id)
            ml_status = "unavailable"
            try:
                response = requests.get(f"{self.ML_API_URL}/api/health", timeout=5)
                ml_status = "available" if response.status_code == 200 else "error"
            except:
                ml_status = "unavailable"
            
            groq_status = "configured" if self.GROQ_API_KEY else "not configured"
            
            return {
                'status': 'connected',
                'student_found': student_data is not None,
                'ml_api': ml_status,
                'groq_api': groq_status,
                'predictions_count': len(self.get_stored_predictions(student_id))
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}