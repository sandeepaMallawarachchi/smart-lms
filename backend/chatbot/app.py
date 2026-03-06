from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from threading import Lock
from dotenv import load_dotenv
from modules.project_task_chatbot import ProjectTaskChatbot
from modules.analytics_chatbot import AnalyticsChatbot

load_dotenv()

app = Flask(__name__)
CORS(app)

_project_task_bot = None
_analytics_bot = None
_project_task_lock = Lock()
_analytics_lock = Lock()


def get_project_task_bot():
    global _project_task_bot
    if _project_task_bot is None:
        with _project_task_lock:
            if _project_task_bot is None:
                _project_task_bot = ProjectTaskChatbot()
    return _project_task_bot


def get_analytics_bot():
    global _analytics_bot
    if _analytics_bot is None:
        with _analytics_lock:
            if _analytics_bot is None:
                _analytics_bot = AnalyticsChatbot()
    return _analytics_bot

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'modules': {
            'project_tasks': 'loaded' if _project_task_bot is not None else 'lazy',
            'learning_analytics': 'loaded' if _analytics_bot is not None else 'lazy',
        },
    })

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_query = data.get('query', '')
        student_id = data.get('studentId', '')
        module_hint = data.get('module', None)
        
        if not user_query or not student_id:
            return jsonify({'error': 'Query and studentId required'}), 400
        
        if module_hint == 'analytics':
            response_data = get_analytics_bot().handle_query(user_query, student_id)
        elif module_hint == 'tasks':
            response_data = get_project_task_bot().handle_query(user_query, student_id)
        else:
            query_lower = user_query.lower()
            analytics_keywords = ['prediction', 'predict', 'risk', 'performance', 'analytics', 'grades', 'score', 'gpa', 'academic', 'failing', 'recommendation', 'suggest', 'improve', 'study']
            task_keywords = ['project', 'task', 'deadline', 'assignment', 'due', 'todo', 'board', 'complete', 'work']
            
            analytics_score = sum(1 for k in analytics_keywords if k in query_lower)
            task_score = sum(1 for k in task_keywords if k in query_lower)
            
            if analytics_score > task_score:
                response_data = get_analytics_bot().handle_query(user_query, student_id)
            elif task_score > 0:
                response_data = get_project_task_bot().handle_query(user_query, student_id)
            else:
                response_data = {'response': 'I can help with project management or learning analytics. What would you like?', 'intent': 'menu'}
        
        return jsonify(response_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/heatmap', methods=['POST'])
def heatmap():
    try:
        data = request.json
        student_id = data.get('studentId', '')
        if not student_id:
            return jsonify({'error': 'studentId required'}), 400
        return jsonify(get_project_task_bot().generate_heatmap(student_id))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/analytics/predictions', methods=['POST'])
def analytics_predictions():
    try:
        data = request.json
        student_id = data.get('studentId', '')
        if not student_id:
            return jsonify({'error': 'studentId required'}), 400
        return jsonify(get_analytics_bot().get_predictions(student_id))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/analytics/student-insights', methods=['POST'])
def analytics_student_insights():
    try:
        data = request.json or {}
        result = get_analytics_bot().get_students_insights(data)
        status_code = 200 if result.get('success', False) else 500
        return jsonify(result), status_code
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/analytics/predictive-analytics', methods=['POST'])
def analytics_predictive_analytics():
    try:
        data = request.json or {}
        result = get_analytics_bot().get_predictive_analytics(data)
        status_code = 200 if result.get('success', False) else 500
        return jsonify(result), status_code
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/test', methods=['POST'])
def test():
    try:
        data = request.json
        student_id = data.get('studentId')
        return jsonify({
            'studentId': student_id,
            'modules': {
                'project_task': get_project_task_bot().test_connection(student_id),
                'learning_analytics': get_analytics_bot().test_connection(student_id)
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Smart LMS Multi-Module Chatbot API...")
    app.run(host='0.0.0.0', port=5001, debug=True)
