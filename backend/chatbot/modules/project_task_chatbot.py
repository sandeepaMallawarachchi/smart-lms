from sentence_transformers import SentenceTransformer
from datetime import datetime, timedelta
import numpy as np
from pymongo import MongoClient
from bson import ObjectId
import os

class ProjectTaskChatbot:
    def __init__(self):
        print("Loading Project/Task module...")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        MONGO_URI = os.getenv('MONGODB_URI')
        self.client = MongoClient(MONGO_URI)
        self.db = self.client['test']
        
        self.INTENTS = {
            "list_projects": ["projects", "assignments", "what do i have", "show my projects", "project list"],
            "upcoming_deadlines": ["deadline", "due date", "when is due", "upcoming", "next deadline"],
            "task_summary": ["summary", "progress", "completion", "how am i doing", "status"],
            "prioritized_tasks": ["priority", "urgent", "important", "what should i do", "todo"],
            "project_details": ["details about", "tell me about", "information on", "what is"],
            "completion_rate": ["completion rate", "percentage", "how much done", "completion"],
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
        
        return best_intent if best_score > 0.5 else "general_question"
    
    def get_student_courses(self, student_id):
        student = self.db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return []
        
        year = int(student.get('academicYear') or student.get('year', 1))
        semester = int(student.get('semester', 1))
        specialization = student.get('specialization', '')
        
        courses = list(self.db.courses.find({
            "year": year,
            "semester": semester,
            "specializations": specialization,
            "isArchived": False
        }))
        
        if len(courses) == 0:
            courses = list(self.db.courses.find({
                "year": year,
                "semester": semester,
                "specializations": specialization,
            }))
        
        return courses
    
    def get_student_projects(self, student_id):
        courses = self.get_student_courses(student_id)
        course_ids = [str(course['_id']) for course in courses]
        projects = list(self.db.projects.find({"courseId": {"$in": course_ids}}))
        
        for project in projects:
            progress = self.db.studentprojectprogresses.find_one({
                "studentId": student_id,
                "projectId": str(project["_id"])
            })
            project['progress'] = progress
            course = next((c for c in courses if str(c['_id']) == project['courseId']), None)
            project['course'] = course
        
        return projects
    
    def get_student_tasks(self, student_id):
        courses = self.get_student_courses(student_id)
        course_ids = [str(course['_id']) for course in courses]
        tasks = list(self.db.tasks.find({"courseId": {"$in": course_ids}}))
        
        for task in tasks:
            progress = self.db.studenttaskprogresses.find_one({
                "studentId": student_id,
                "taskId": str(task["_id"])
            })
            task['progress'] = progress
            course = next((c for c in courses if str(c['_id']) == task['courseId']), None)
            task['course'] = course
        
        return tasks
    
    def format_project_response(self, projects):
        if not projects:
            return "You don't have any projects assigned yet."
        
        response = f"You have {len(projects)} project(s):\n\n"
        for i, project in enumerate(projects, 1):
            status = project.get('progress', {}).get('status', 'todo') if project.get('progress') else 'todo'
            course_name = project.get('course', {}).get('courseName', 'Unknown Course') if project.get('course') else 'Unknown Course'
            
            response += f"{i}. **{project['projectName']}** ({project['projectType']})\n"
            response += f"   - Status: {status.upper()}\n"
            response += f"   - Deadline: {project['deadlineDate']} at {project.get('deadlineTime', '23:59')}\n"
            response += f"   - Course: {course_name}\n\n"
        
        return response
    
    def get_prioritized_tasks(self, student_id):
        projects = self.get_student_projects(student_id)
        tasks = self.get_student_tasks(student_id)
        all_items = []
        
        for project in projects:
            progress = project.get('progress', {})
            status = progress.get('status', 'todo') if progress else 'todo'
            if status != 'done':
                deadline = datetime.strptime(project['deadlineDate'], '%Y-%m-%d')
                course_name = project.get('course', {}).get('courseName', 'Unknown') if project.get('course') else 'Unknown'
                all_items.append({
                    'type': 'project',
                    'name': project['projectName'],
                    'deadline': deadline,
                    'status': status,
                    'course': course_name
                })
        
        for task in tasks:
            progress = task.get('progress', {})
            status = progress.get('status', 'todo') if progress else 'todo'
            if status != 'done' and task.get('deadlineDate'):
                deadline = datetime.strptime(task['deadlineDate'], '%Y-%m-%d')
                course_name = task.get('course', {}).get('courseName', 'Unknown') if task.get('course') else 'Unknown'
                all_items.append({
                    'type': 'task',
                    'name': task['taskName'],
                    'deadline': deadline,
                    'status': status,
                    'course': course_name
                })
        
        all_items.sort(key=lambda x: x['deadline'])
        
        if not all_items:
            return "Great! You don't have any pending tasks or projects right now."
        
        response = "**Your Prioritized To-Do List:**\n\n"
        for i, item in enumerate(all_items[:10], 1):
            days_left = (item['deadline'] - datetime.now()).days
            urgency = "🔴 URGENT" if days_left < 2 else "🟡 SOON" if days_left < 7 else "🟢"
            response += f"{i}. {urgency} **{item['name']}** ({item['type']})\n"
            response += f"   - {item['course']}\n"
            response += f"   - Due: {item['deadline'].strftime('%Y-%m-%d')} ({days_left} days)\n"
            response += f"   - Status: {item['status'].upper()}\n\n"
        
        return response
    
    def get_completion_summary(self, student_id):
        projects = self.get_student_projects(student_id)
        tasks = self.get_student_tasks(student_id)
        
        total_projects = len(projects)
        completed_projects = sum(1 for p in projects if p.get('progress', {}).get('status') == 'done')
        inprogress_projects = sum(1 for p in projects if p.get('progress', {}).get('status') == 'inprogress')
        todo_projects = sum(1 for p in projects if not p.get('progress') or p.get('progress', {}).get('status') == 'todo')
        
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.get('progress', {}).get('status') == 'done')
        inprogress_tasks = sum(1 for t in tasks if t.get('progress', {}).get('status') == 'inprogress')
        todo_tasks = sum(1 for t in tasks if not t.get('progress') or t.get('progress', {}).get('status') == 'todo')
        
        response = "**Your Progress Summary:**\n\n"
        response += f"**Projects:**\n"
        response += f"- Total: {total_projects}\n"
        response += f"- Completed: {completed_projects}\n"
        response += f"- In Progress: {inprogress_projects}\n"
        response += f"- To Do: {todo_projects}\n"
        response += f"- Completion Rate: {(completed_projects/total_projects*100) if total_projects > 0 else 0:.1f}%\n\n"
        response += f"**Tasks:**\n"
        response += f"- Total: {total_tasks}\n"
        response += f"- Completed: {completed_tasks}\n"
        response += f"- In Progress: {inprogress_tasks}\n"
        response += f"- To Do: {todo_tasks}\n"
        response += f"- Completion Rate: {(completed_tasks/total_tasks*100) if total_tasks > 0 else 0:.1f}%\n"
        
        return response
    
    def generate_heatmap(self, student_id):
        project_progress = list(self.db.studentprojectprogresses.find({"studentId": student_id}))
        task_progress = list(self.db.studenttaskprogresses.find({"studentId": student_id}))
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        activity_map = {}
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            activity_map[date_str] = 0
            current_date += timedelta(days=1)
        
        for progress in project_progress + task_progress:
            if 'updatedAt' in progress:
                date_str = progress['updatedAt'].strftime('%Y-%m-%d')
                if date_str in activity_map:
                    activity_map[date_str] += 1
        
        heatmap_data = []
        for date_str, count in activity_map.items():
            heatmap_data.append({'date': date_str, 'count': count, 'level': min(count, 4)})
        
        return {
            'heatmap': heatmap_data,
            'totalDays': len(heatmap_data),
            'totalActivities': sum(d['count'] for d in heatmap_data)
        }
    
    def handle_query(self, user_query, student_id):
        intent = self.classify_intent(user_query)
        
        if intent == "list_projects":
            projects = self.get_student_projects(student_id)
            response = self.format_project_response(projects)
        elif intent == "prioritized_tasks":
            response = self.get_prioritized_tasks(student_id)
        elif intent == "task_summary":
            response = self.get_completion_summary(student_id)
        elif intent == "upcoming_deadlines":
            projects = self.get_student_projects(student_id)
            tasks = self.get_student_tasks(student_id)
            all_items = []
            
            for project in projects:
                progress = project.get('progress', {})
                status = progress.get('status', 'todo') if progress else 'todo'
                if status != 'done':
                    all_items.append({'name': project['projectName'], 'deadline': project['deadlineDate'], 'type': 'project'})
            
            for task in tasks:
                progress = task.get('progress', {})
                status = progress.get('status', 'todo') if progress else 'todo'
                if status != 'done' and task.get('deadlineDate'):
                    all_items.append({'name': task['taskName'], 'deadline': task['deadlineDate'], 'type': 'task'})
            
            all_items.sort(key=lambda x: x['deadline'])
            response = "**Upcoming Deadlines:**\n\n"
            for item in all_items[:5]:
                response += f"- **{item['name']}** ({item['type']}): {item['deadline']}\n"
        else:
            response = "I can help you with:\n- Listing your projects\n- Showing prioritized tasks\n- Progress summaries\n- Upcoming deadlines"
        
        return {'response': response, 'intent': intent, 'module': 'project_task'}
    
    def test_connection(self, student_id):
        try:
            student = self.db.students.find_one({"_id": ObjectId(student_id)})
            courses = self.get_student_courses(student_id)
            course_ids = [str(c['_id']) for c in courses]
            projects = list(self.db.projects.find({"courseId": {"$in": course_ids}}))
            tasks = list(self.db.tasks.find({"courseId": {"$in": course_ids}}))
            progress = list(self.db.studentprojectprogresses.find({"studentId": student_id}))
            
            return {
                'status': 'connected',
                'student': {'name': student.get('name') if student else None},
                'courses_count': len(courses),
                'projects_count': len(projects),
                'tasks_count': len(tasks),
                'progress_count': len(progress)
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}