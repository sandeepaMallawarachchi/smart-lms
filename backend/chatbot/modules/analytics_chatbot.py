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
        self.HEATMAP_URL = os.getenv('HEATMAP_SERVICE_URL', 'http://localhost:5002/heatmap')
        
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
                payload = self._build_payload_from_activity(
                    student=student,
                    student_id=student_id,
                    gender=gender,
                    age_band=age_band
                )
            
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

    def _build_payload_from_activity(self, student, student_id, gender, age_band):
        # Course credits
        year = int(student.get('academicYear') or student.get('year', 1))
        semester = int(student.get('semester', 1))
        specialization = student.get('specialization', '')
        courses = list(self.db.courses.find({
            "year": year,
            "semester": semester,
            "specializations": specialization
        }))
        studied_credits = sum([c.get('credits', 0) for c in courses])
        course_ids = [str(c["_id"]) for c in courses]

        projects = list(self.db.projects.find({"courseId": {"$in": course_ids}}))
        tasks = list(self.db.tasks.find({"courseId": {"$in": course_ids}}))
        project_progress = list(self.db.studentprojectprogresses.find({"studentId": student_id}))
        task_progress = list(self.db.studenttaskprogresses.find({"studentId": student_id}))

        project_map = {str(p["_id"]): p for p in projects}
        task_map = {str(t["_id"]): t for t in tasks}

        progress_dates = []
        completed_projects = 0
        completed_tasks = 0
        late_count = 0

        for p in project_progress:
            if p.get("updatedAt"):
                progress_dates.append(p["updatedAt"])
            if p.get("status") == "done":
                completed_projects += 1
                project = project_map.get(p.get("projectId"))
                if project and project.get("deadlineDate") and p.get("updatedAt"):
                    delay_days = self._days_early(p["updatedAt"], project["deadlineDate"])
                    if delay_days is not None and delay_days < 0:
                        late_count += 1

        for t in task_progress:
            if t.get("updatedAt"):
                progress_dates.append(t["updatedAt"])
            if t.get("status") == "done":
                completed_tasks += 1
                task = task_map.get(t.get("taskId"))
                if task and task.get("deadlineDate") and t.get("updatedAt"):
                    delay_days = self._days_early(t["updatedAt"], task["deadlineDate"])
                    if delay_days is not None and delay_days < 0:
                        late_count += 1

        total_items = len(projects) + len(tasks)
        completion_rate = (completed_projects + completed_tasks) / total_items if total_items > 0 else 0

        days_active = 0
        study_span_days = 0
        if progress_dates:
            sorted_dates = sorted(progress_dates)
            unique_days = set([d.strftime("%Y-%m-%d") for d in sorted_dates])
            days_active = len(unique_days)
            study_span_days = max(1, (sorted_dates[-1] - sorted_dates[0]).days + 1)

        # Heatmap service for activity counts
        total_clicks = 0
        avg_clicks_per_day = 0
        max_clicks_single_day = 0
        clicks_std = 0
        try:
            resp = requests.post(self.HEATMAP_URL, json={"studentId": student_id}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                summary = data.get("summary", {})
                heatmap = [d for d in data.get("heatmap", []) if not d.get("isPrediction")]
                counts = [d.get("count", 0) for d in heatmap]
                if counts:
                    mean = sum(counts) / len(counts)
                    variance = sum([(c - mean) ** 2 for c in counts]) / len(counts)
                    clicks_std = variance ** 0.5
                total_clicks = summary.get("totalActivities", sum(counts))
                avg_clicks_per_day = summary.get("averageDaily", sum(counts) / len(counts) if counts else 0)
                max_clicks_single_day = summary.get("maxDaily", max(counts) if counts else 0)
                if not days_active:
                    days_active = summary.get("activeDays", 0)
        except Exception:
            pass

        engagement_regularity = clicks_std / avg_clicks_per_day if avg_clicks_per_day else 0

        # Scores and timing from submissions are disabled for now
        return {
            "student_id": student.get("studentIdNumber", student_id),
            "total_clicks": total_clicks,
            "avg_clicks_per_day": avg_clicks_per_day,
            "clicks_std": clicks_std,
            "max_clicks_single_day": max_clicks_single_day,
            "days_active": days_active,
            "study_span_days": study_span_days,
            "engagement_regularity": engagement_regularity,
            "pre_course_clicks": 0,
            "avg_score": 0,
            "score_std": 0,
            "min_score": 0,
            "max_score": 0,
            "completion_rate": completion_rate,
            "first_score": 0,
            "score_improvement": 0,
            "avg_days_early": 0,
            "timing_consistency": 0,
            "worst_delay": 0,
            "late_submission_count": late_count,
            "num_of_prev_attempts": 0,
            "studied_credits": studied_credits,
            "early_registration": 0,
            "withdrew": 0,
            "gender": gender,
            "age_band": age_band,
            "highest_education": "A Level or Equivalent",
            "disability": "N"
        }

    def _days_early(self, submitted_at, due_date_str):
        try:
            due = datetime.strptime(due_date_str, "%Y-%m-%d")
            submitted = submitted_at if isinstance(submitted_at, datetime) else datetime.fromisoformat(str(submitted_at))
            return (due - submitted).days
        except Exception:
            return None
    
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

    def get_predictive_analytics(self, filters=None):
        """
        Lecturer predictive analytics view:
        - Uses trained ML model scores (risk/confidence)
        - Uses NLP recommender (Groq + fallback) for personalized actions
        """
        try:
            filters = filters or {}
            recommendation_limit = int(filters.get("recommendationLimit", 8))

            insights_result = self.get_students_insights({
                "lecturerId": filters.get("lecturerId"),
                "courseId": filters.get("courseId"),
                "year": filters.get("year"),
                "semester": filters.get("semester"),
                "specialization": filters.get("specialization"),
                "includeLivePrediction": True,
                "limit": int(filters.get("limit", 200)),
            })

            if not insights_result.get("success"):
                return insights_result

            students = insights_result.get("students", [])
            summary = insights_result.get("summary", {})
            live_prediction = insights_result.get("livePrediction", {})

            # Build risk clusters
            high_risk = [s for s in students if s.get("riskLevel") == "high"]
            medium_risk = [s for s in students if s.get("riskLevel") == "medium"]
            low_risk = [s for s in students if s.get("riskLevel") == "low"]

            # Priority order for recommendations: high -> medium -> top risk
            ordered = sorted(students, key=lambda s: float(s.get("riskProbability", 0) or 0), reverse=True)
            target_students = high_risk + medium_risk
            if len(target_students) < recommendation_limit:
                seen = set([s.get("studentId") for s in target_students])
                for s in ordered:
                    sid = s.get("studentId")
                    if sid not in seen:
                        target_students.append(s)
                        seen.add(sid)
                    if len(target_students) >= recommendation_limit:
                        break
            else:
                target_students = target_students[:recommendation_limit]

            personalized = []
            for s in target_students:
                sid = s.get("studentId")
                student_ctx = self.get_student_data(sid) or {}
                prediction_data = {
                    "risk_category": str(s.get("riskLevel", "UNKNOWN")).upper(),
                    "risk_score": float(s.get("riskProbability", 0) or 0) / 100.0,
                    "confidence": float(s.get("confidence", 0) or 0) / 100.0
                }
                recommendation_text = self.generate_recommendations(sid, prediction_data, student_ctx)
                personalized.append({
                    "studentId": sid,
                    "studentIdNumber": s.get("studentIdNumber"),
                    "name": s.get("name"),
                    "riskLevel": s.get("riskLevel"),
                    "riskProbability": s.get("riskProbability"),
                    "completionRate": s.get("completionRate"),
                    "engagement": s.get("engagement"),
                    "recommendation": recommendation_text,
                })

            avg_risk = 0
            if students:
                avg_risk = sum([float(s.get("riskProbability", 0) or 0) for s in students]) / len(students)

            class_guidance = []
            if summary.get("highRisk", 0) > 0:
                class_guidance.append("Prioritize interventions for high-risk students this week.")
            if live_prediction.get("enabled"):
                class_guidance.append("Live ML predictions are active for current cohort scoring.")
            else:
                class_guidance.append("Live ML predictions are unavailable; using stored analytics snapshots.")
            if avg_risk >= 60:
                class_guidance.append("Overall class risk is elevated. Consider targeted revision sessions.")
            elif avg_risk >= 35:
                class_guidance.append("Class risk is moderate. Weekly check-ins can improve outcomes.")
            else:
                class_guidance.append("Class risk is currently low. Maintain momentum with regular feedback.")

            return {
                "success": True,
                "summary": {
                    **summary,
                    "averageRiskProbability": round(avg_risk, 1),
                    "highRiskRatio": round((summary.get("highRisk", 0) / summary.get("totalStudents", 1)) * 100, 1)
                    if summary.get("totalStudents", 0) > 0
                    else 0.0
                },
                "riskBands": {
                    "high": len(high_risk),
                    "medium": len(medium_risk),
                    "low": len(low_risk)
                },
                "livePrediction": live_prediction,
                "classGuidance": class_guidance,
                "topStudentsByRisk": ordered[:10],
                "personalizedRecommendations": personalized,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    def get_students_insights(self, filters=None):
        """
        Build lecturer-friendly student insights list.
        Uses stored predictions first; optionally calls live ML prediction for missing rows.
        """
        try:
            filters = filters or {}
            lecturer_id = filters.get('lecturerId')
            course_id = filters.get('courseId')
            year = filters.get('year')
            semester = filters.get('semester')
            specialization = filters.get('specialization')
            include_live_prediction = bool(filters.get('includeLivePrediction', False))
            limit = int(filters.get('limit', 200))
            live_prediction_available = False
            live_prediction_error = None

            if include_live_prediction:
                try:
                    health = requests.get(f"{self.ML_API_URL}/api/health", timeout=5)
                    live_prediction_available = health.status_code == 200
                    if not live_prediction_available:
                        live_prediction_error = f"ML API unhealthy ({health.status_code})"
                except Exception as e:
                    live_prediction_available = False
                    live_prediction_error = str(e)

            course_query = {"isArchived": False}
            if course_id:
                course_query["_id"] = ObjectId(course_id)
            else:
                if lecturer_id:
                    course_query["$or"] = [
                        {"lecturerInCharge": ObjectId(lecturer_id)},
                        {"lecturers": ObjectId(lecturer_id)}
                    ]
                if year is not None:
                    course_query["year"] = int(year)
                if semester is not None:
                    course_query["semester"] = int(semester)
                if specialization:
                    course_query["specializations"] = specialization

            courses = list(self.db.courses.find(course_query))

            student_query = {}
            if courses:
                scopes = []
                for course in courses:
                    for spec in course.get("specializations", []):
                        scopes.append({
                            "academicYear": str(course.get("year")),
                            "semester": str(course.get("semester")),
                            "specialization": spec
                        })
                if scopes:
                    student_query["$or"] = scopes
            else:
                if year is not None:
                    student_query["academicYear"] = str(year)
                if semester is not None:
                    student_query["semester"] = str(semester)
                if specialization:
                    student_query["specialization"] = specialization

            students = list(self.db.students.find(student_query).limit(limit))

            unique_students = {}
            for student in students:
                unique_students[str(student["_id"])] = student
            students = list(unique_students.values())

            insights = []
            for student in students:
                sid = str(student["_id"])
                latest_prediction = self.db.predictions.find_one(
                    {"studentId": sid},
                    sort=[("createdAt", -1)]
                )

                risk_level = "unknown"
                risk_probability = 0.0
                confidence = 0.0
                completion_rate = 0.0
                engagement = 0
                avg_score = 0.0
                late_submission_count = 0
                source = "none"
                predicted_at = None

                if latest_prediction and latest_prediction.get("prediction"):
                    pred = latest_prediction.get("prediction", {})
                    input_data = latest_prediction.get("inputData", {})
                    risk_level = str(pred.get("risk_level", "unknown")).lower()
                    risk_probability = float(pred.get("risk_probability", 0) or 0)
                    confidence = float(pred.get("confidence", 0) or 0)
                    completion_rate = float(input_data.get("completion_rate", 0) or 0)
                    engagement = int(input_data.get("total_clicks", 0) or 0)
                    avg_score = float(input_data.get("avg_score", 0) or 0)
                    late_submission_count = int(input_data.get("late_submission_count", 0) or 0)
                    predicted_at = latest_prediction.get("createdAt")
                    source = "stored_prediction"
                
                # Enrich empty/zero metrics from activity-derived payload.
                # This keeps project/task-based metrics available even when stored prediction is sparse.
                if completion_rate <= 0 or engagement <= 0 or late_submission_count <= 0:
                    try:
                        gender = self._map_gender(student.get("gender", "male"))
                        age_band = self._compute_age_band(student.get("dateOfBirth"))
                        activity_payload = self._build_payload_from_activity(
                            student=student,
                            student_id=sid,
                            gender=gender,
                            age_band=age_band
                        )
                        completion_rate = completion_rate if completion_rate > 0 else float(activity_payload.get("completion_rate", 0))
                        engagement = engagement if engagement > 0 else int(activity_payload.get("total_clicks", 0))
                        late_submission_count = late_submission_count if late_submission_count > 0 else int(activity_payload.get("late_submission_count", 0))
                    except Exception:
                        pass

                if (not latest_prediction) and include_live_prediction and live_prediction_available:
                    live_prediction = self.get_risk_prediction(sid)
                    if not live_prediction.get("error"):
                        risk_level = str(live_prediction.get("risk_category", "unknown")).lower()
                        risk_probability = float(live_prediction.get("risk_score", 0) or 0)
                        confidence = float(live_prediction.get("confidence", 0) or 0)
                        source = "live_prediction"
                        predicted_at = datetime.utcnow()

                matched_courses = []
                for course in courses:
                    if (
                        str(course.get("year")) == str(student.get("academicYear"))
                        and str(course.get("semester")) == str(student.get("semester"))
                        and student.get("specialization") in course.get("specializations", [])
                    ):
                        matched_courses.append({
                            "courseId": str(course.get("_id")),
                            "courseName": course.get("courseName", "")
                        })

                insights.append({
                    "studentId": sid,
                    "studentIdNumber": student.get("studentIdNumber", ""),
                    "name": student.get("name", ""),
                    "email": student.get("email", ""),
                    "specialization": student.get("specialization", ""),
                    "academicYear": student.get("academicYear", ""),
                    "semester": student.get("semester", ""),
                    "riskLevel": risk_level,
                    "riskProbability": round(risk_probability * 100, 1) if risk_probability <= 1 else round(risk_probability, 1),
                    "confidence": round(confidence * 100, 1) if confidence <= 1 else round(confidence, 1),
                    "completionRate": round(completion_rate * 100, 1) if completion_rate <= 1 else round(completion_rate, 1),
                    "engagement": engagement,
                    "avgScore": round(avg_score, 1),
                    "lateSubmissionCount": late_submission_count,
                    "courses": matched_courses,
                    "predictionSource": source,
                    "predictedAt": predicted_at.isoformat() if isinstance(predicted_at, datetime) else (str(predicted_at) if predicted_at else None),
                })

            insights.sort(key=lambda x: (x["riskProbability"], x["completionRate"] * -1), reverse=True)

            summary = {
                "totalStudents": len(insights),
                "highRisk": len([i for i in insights if i["riskLevel"] == "high"]),
                "mediumRisk": len([i for i in insights if i["riskLevel"] == "medium"]),
                "lowRisk": len([i for i in insights if i["riskLevel"] == "low"]),
                "unknownRisk": len([i for i in insights if i["riskLevel"] not in ["high", "medium", "low"]]),
            }

            return {
                "success": True,
                "summary": summary,
                "students": insights,
                "livePrediction": {
                    "requested": include_live_prediction,
                    "enabled": bool(include_live_prediction and live_prediction_available),
                    "error": live_prediction_error
                },
                "filters": {
                    "lecturerId": lecturer_id,
                    "courseId": course_id,
                    "year": year,
                    "semester": semester,
                    "specialization": specialization,
                    "includeLivePrediction": include_live_prediction,
                    "limit": limit
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    def _map_gender(self, gender):
        gender_map = {'male': 'M', 'female': 'F', 'other': 'O'}
        return gender_map.get(str(gender).lower(), 'M')

    def _compute_age_band(self, dob):
        try:
            if not dob:
                return '0-35'
            if isinstance(dob, str):
                birth_date = datetime.fromisoformat(dob.replace('Z', '+00:00'))
            else:
                birth_date = dob
            age = (datetime.now() - birth_date).days // 365
            if age <= 35:
                return '0-35'
            if age <= 55:
                return '35-55'
            return '55<='
        except Exception:
            return '0-35'
    
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
