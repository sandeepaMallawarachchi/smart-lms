from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
from config import Config

class DataLoader:
    def __init__(self):
        self.client = MongoClient(Config.MONGODB_URI)
        self.db = self.client['test']
    
    def get_activity_history(self, student_id, days=365):
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        project_progress = list(self.db.studentprojectprogresses.find({
            "studentId": student_id,
            "updatedAt": {"$gte": start_date, "$lte": end_date}
        }))
        
        task_progress = list(self.db.studenttaskprogresses.find({
            "studentId": student_id,
            "updatedAt": {"$gte": start_date, "$lte": end_date}
        }))
        
        activity_map = {}
        current = start_date
        while current <= end_date:
            activity_map[current.strftime('%Y-%m-%d')] = 0
            current += timedelta(days=1)
        
        for progress in project_progress + task_progress:
            if 'updatedAt' in progress:
                date_str = progress['updatedAt'].strftime('%Y-%m-%d')
                if date_str in activity_map:
                    activity_map[date_str] += 1
        
        return activity_map
    
    def get_student_courses(self, student_id):
        student = self.db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return []
        
        year = int(student.get('academicYear') or student.get('year', 1))
        semester = int(student.get('semester', 1))
        specialization = student.get('specialization', '')
        
        return list(self.db.courses.find({
            "year": year,
            "semester": semester,
            "specializations": specialization
        }))
    
    def get_deadlines(self, student_id):
        courses = self.get_student_courses(student_id)
        course_ids = [str(c['_id']) for c in courses]
        
        projects = list(self.db.projects.find({"courseId": {"$in": course_ids}}))
        tasks = list(self.db.tasks.find({"courseId": {"$in": course_ids}}))
        
        deadlines = []
        today = datetime.now()
        
        for item in projects + tasks:
            if item.get('deadlineDate'):
                deadline = datetime.strptime(item['deadlineDate'], '%Y-%m-%d')
                if deadline >= today:
                    deadlines.append(deadline)
        
        return sorted(deadlines)
    
    def get_active_projects(self, student_id):
        courses = self.get_student_courses(student_id)
        course_ids = [str(c['_id']) for c in courses]
        projects = list(self.db.projects.find({"courseId": {"$in": course_ids}}))
        
        count = 0
        for project in projects:
            progress = self.db.studentprojectprogresses.find_one({
                "studentId": student_id,
                "projectId": str(project["_id"])
            })
            if progress and progress.get('status') in ['todo', 'inprogress']:
                count += 1
        
        return count
    
    def get_semester_start(self, student_id):
        student = self.db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return datetime.now() - timedelta(weeks=12)
        
        semester = student.get('semester', 1)
        start_month = 1 if semester == 1 else 6
        current_year = datetime.now().year
        semester_start = datetime(current_year, start_month, 1)
        
        if semester_start > datetime.now():
            semester_start = datetime(current_year - 1, start_month, 1)
        
        return semester_start