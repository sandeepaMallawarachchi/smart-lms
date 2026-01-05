from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import numpy as np
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize NLP models
print("Loading NLP models...")
sentence_model = SentenceTransformer('all-MiniLM-L6-v2')

# MongoDB connection
MONGO_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGO_URI)
db = client['test']

# Intent classification data
INTENTS = {
    "list_projects": ["projects", "assignments", "what do i have", "show my projects", "project list"],
    "upcoming_deadlines": ["deadline", "due date", "when is due", "upcoming", "next deadline"],
    "task_summary": ["summary", "progress", "completion", "how am i doing", "status"],
    "prioritized_tasks": ["priority", "urgent", "important", "what should i do", "todo"],
    "project_details": ["details about", "tell me about", "information on", "what is"],
    "completion_rate": ["completion rate", "percentage", "how much done", "completion"],
}

def classify_intent(user_query):
    """Classify user intent using sentence similarity"""
    query_embedding = sentence_model.encode(user_query.lower())
    
    best_intent = None
    best_score = 0
    
    for intent, keywords in INTENTS.items():
        for keyword in keywords:
            keyword_embedding = sentence_model.encode(keyword)
            similarity = np.dot(query_embedding, keyword_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(keyword_embedding)
            )
            if similarity > best_score:
                best_score = similarity
                best_intent = intent
    
    return best_intent if best_score > 0.5 else "general_question"

def get_student_courses(student_id):
    """Get courses the student is enrolled in"""
    # Find student document
    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        print(f"Student not found: {student_id}")
        return []
    
    # Get student's year, semester, and specialization
    # IMPORTANT: Convert to int since they're stored as strings in DB
    year = int(student.get('academicYear') or student.get('year', 1))
    semester = int(student.get('semester', 1))
    specialization = student.get('specialization', '')
    
    print(f"Student: Year {year}, Semester {semester}, Specialization: {specialization}")
    
    # Find matching courses
    courses = list(db.courses.find({
        "year": year,
        "semester": semester,
        "specializations": specialization,
        "isArchived": False
    }))
    
    print(f"Found {len(courses)} courses")
    
    # If no courses found, try without isArchived filter
    if len(courses) == 0:
        courses = list(db.courses.find({
            "year": year,
            "semester": semester,
            "specializations": specialization,
        }))
        print(f"Retrying without isArchived filter: Found {len(courses)} courses")
    
    return courses

def get_student_projects(student_id):
    """Get all projects for a student based on their courses"""
    courses = get_student_courses(student_id)
    course_ids = [str(course['_id']) for course in courses]
    
    print(f"Searching projects in courses: {course_ids}")
    
    projects = list(db.projects.find({
        "courseId": {"$in": course_ids}
    }))
    
    print(f"Found {len(projects)} projects")
    
    # Get progress for each project
    for project in projects:
        progress = db.studentprojectprogresses.find_one({
            "studentId": student_id,
            "projectId": str(project["_id"])
        })
        project['progress'] = progress
        
        # Get course details
        course = next((c for c in courses if str(c['_id']) == project['courseId']), None)
        project['course'] = course
    
    return projects

def get_student_tasks(student_id):
    """Get all tasks for a student based on their courses"""
    courses = get_student_courses(student_id)
    course_ids = [str(course['_id']) for course in courses]
    
    print(f"Searching tasks in courses: {course_ids}")
    
    tasks = list(db.tasks.find({
        "courseId": {"$in": course_ids}
    }))
    
    print(f"Found {len(tasks)} tasks")
    
    # Get progress for each task
    for task in tasks:
        progress = db.studenttaskprogresses.find_one({
            "studentId": student_id,
            "taskId": str(task["_id"])
        })
        task['progress'] = progress
        
        # Get course details
        course = next((c for c in courses if str(c['_id']) == task['courseId']), None)
        task['course'] = course
    
    return tasks

def format_project_response(projects):
    """Format projects into readable response"""
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

def get_prioritized_tasks(student_id):
    """Get tasks prioritized by deadline"""
    projects = get_student_projects(student_id)
    tasks = get_student_tasks(student_id)
    
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
    
    # Sort by deadline
    all_items.sort(key=lambda x: x['deadline'])
    
    if not all_items:
        return "Great! You don't have any pending tasks or projects right now."
    
    response = "**Your Prioritized To-Do List:**\n\n"
    for i, item in enumerate(all_items[:10], 1):  # Top 10
        days_left = (item['deadline'] - datetime.now()).days
        urgency = "🔴 URGENT" if days_left < 2 else "🟡 SOON" if days_left < 7 else "🟢"
        
        response += f"{i}. {urgency} **{item['name']}** ({item['type']})\n"
        response += f"   - {item['course']}\n"
        response += f"   - Due: {item['deadline'].strftime('%Y-%m-%d')} ({days_left} days)\n"
        response += f"   - Status: {item['status'].upper()}\n\n"
    
    return response

def get_completion_summary(student_id):
    """Get completion summary"""
    projects = get_student_projects(student_id)
    tasks = get_student_tasks(student_id)
    
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

def generate_activity_heatmap(student_id):
    """Generate GitHub-style activity heatmap data"""
    print(f"Generating heatmap for student: {student_id}")
    
    # Get all progress updates
    project_progress = list(db.studentprojectprogresses.find({"studentId": student_id}))
    task_progress = list(db.studenttaskprogresses.find({"studentId": student_id}))
    
    print(f"Found {len(project_progress)} project progress, {len(task_progress)} task progress")
    
    # Create date-activity map for last 365 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    activity_map = {}
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        activity_map[date_str] = 0
        current_date += timedelta(days=1)
    
    # Count activities per day
    for progress in project_progress + task_progress:
        if 'updatedAt' in progress:
            date_str = progress['updatedAt'].strftime('%Y-%m-%d')
            if date_str in activity_map:
                activity_map[date_str] += 1
    
    # Convert to array format for frontend
    heatmap_data = []
    for date_str, count in activity_map.items():
        heatmap_data.append({
            'date': date_str,
            'count': count,
            'level': min(count, 4) 
        })
    
    return heatmap_data

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        data = request.json
        user_query = data.get('query', '')
        student_id = data.get('studentId', '')
        
        if not user_query or not student_id:
            return jsonify({'error': 'Query and studentId required'}), 400
        
        print(f"Query: {user_query} | Student: {student_id}")
        
        # Classify intent
        intent = classify_intent(user_query)
        print(f"Detected intent: {intent}")
        
        # Route to appropriate handler
        if intent == "list_projects":
            projects = get_student_projects(student_id)
            response = format_project_response(projects)
        
        elif intent == "prioritized_tasks":
            response = get_prioritized_tasks(student_id)
        
        elif intent == "task_summary":
            response = get_completion_summary(student_id)
        
        elif intent == "upcoming_deadlines":
            projects = get_student_projects(student_id)
            tasks = get_student_tasks(student_id)
            all_items = []
            
            for project in projects:
                progress = project.get('progress', {})
                status = progress.get('status', 'todo') if progress else 'todo'
                if status != 'done':
                    all_items.append({
                        'name': project['projectName'],
                        'deadline': project['deadlineDate'],
                        'type': 'project'
                    })
            
            for task in tasks:
                progress = task.get('progress', {})
                status = progress.get('status', 'todo') if progress else 'todo'
                if status != 'done' and task.get('deadlineDate'):
                    all_items.append({
                        'name': task['taskName'],
                        'deadline': task['deadlineDate'],
                        'type': 'task'
                    })
            
            all_items.sort(key=lambda x: x['deadline'])
            
            response = "**Upcoming Deadlines:**\n\n"
            for item in all_items[:5]:
                response += f"- **{item['name']}** ({item['type']}): {item['deadline']}\n"
        
        else:
            response = "I can help you with:\n- Listing your projects\n- Showing prioritized tasks\n- Progress summaries\n- Upcoming deadlines\n\nWhat would you like to know?"
        
        return jsonify({
            'response': response,
            'intent': intent
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/heatmap', methods=['POST'])
def heatmap():
    """Generate activity heatmap"""
    try:
        data = request.json
        student_id = data.get('studentId', '')
        
        if not student_id:
            return jsonify({'error': 'studentId required'}), 400
        
        heatmap_data = generate_activity_heatmap(student_id)
        
        return jsonify({
            'heatmap': heatmap_data,
            'totalDays': len(heatmap_data),
            'totalActivities': sum(d['count'] for d in heatmap_data)
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/test', methods=['POST'])
def test():
    """Test endpoint"""
    try:
        data = request.json
        student_id = data.get('studentId')
        
        # Get student info
        student = db.students.find_one({"_id": ObjectId(student_id)})
        
        # Get courses
        courses = get_student_courses(student_id)
        course_ids = [str(c['_id']) for c in courses]
        
        # Get projects and tasks
        projects = list(db.projects.find({"courseId": {"$in": course_ids}}))
        tasks = list(db.tasks.find({"courseId": {"$in": course_ids}}))
        progress = list(db.studentprojectprogresses.find({"studentId": student_id}))
        
        return jsonify({
            'studentId': student_id,
            'student': {
                'name': student.get('name'),
                'year': student.get('academicYear'),
                'semester': student.get('semester'),
                'specialization': student.get('specialization')
            },
            'courses_count': len(courses),
            'courses': [c['courseName'] for c in courses],
            'projects_count': len(projects),
            'tasks_count': len(tasks),
            'progress_count': len(progress),
            'sample_project': projects[0]['projectName'] if projects else None
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Chatbot API is running'})

if __name__ == '__main__':
    print("Starting Smart LMS Chatbot API...")
    app.run(host='0.0.0.0', port=5001, debug=True)