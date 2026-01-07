from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from modules.project_task_chatbot import ProjectTaskChatbot
from modules.analytics_chatbot import AnalyticsChatbot

load_dotenv()

app = Flask(__name__)
CORS(app)

project_task_bot = ProjectTaskChatbot()
analytics_bot = AnalyticsChatbot()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'modules': {'project_tasks': 'active', 'learning_analytics': 'active'}})

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
            response_data = analytics_bot.handle_query(user_query, student_id)
        elif module_hint == 'tasks':
            response_data = project_task_bot.handle_query(user_query, student_id)
        else:
            query_lower = user_query.lower()
            analytics_keywords = ['prediction', 'predict', 'risk', 'performance', 'analytics', 'grades', 'score', 'gpa', 'academic', 'failing', 'recommendation', 'suggest', 'improve', 'study']
            task_keywords = ['project', 'task', 'deadline', 'assignment', 'due', 'todo', 'board', 'complete', 'work']
            
            analytics_score = sum(1 for k in analytics_keywords if k in query_lower)
            task_score = sum(1 for k in task_keywords if k in query_lower)
            
            if analytics_score > task_score:
                response_data = analytics_bot.handle_query(user_query, student_id)
            elif task_score > 0:
                response_data = project_task_bot.handle_query(user_query, student_id)
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
        return jsonify(project_task_bot.generate_heatmap(student_id))
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
        return jsonify(analytics_bot.get_predictions(student_id))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/test', methods=['POST'])
def test():
    try:
        data = request.json
        student_id = data.get('studentId')
        return jsonify({
            'studentId': student_id,
            'modules': {
                'project_task': project_task_bot.test_connection(student_id),
                'learning_analytics': analytics_bot.test_connection(student_id)
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Smart LMS Multi-Module Chatbot API...")
    app.run(host='0.0.0.0', port=5001, debug=True)