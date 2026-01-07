from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import logging
from app.models import predictor

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__)


def init_models():
    """
    Initialize models when blueprint is registered
    """
    try:
        logger.info("Loading ML models...")
        predictor.load_models()
        logger.info("ML models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models: {str(e)}")


@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    if not predictor.model_loaded:
        try:
            init_models()
        except:
            pass
    
    return jsonify({
        'status': 'healthy',
        'model_loaded': predictor.model_loaded,
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }), 200


@api_bp.route('/model/info', methods=['GET'])
def model_info():
    """
    Get information about loaded model
    """
    try:
        if not predictor.model_loaded:
            init_models()
        
        info = predictor.get_model_info()
        return jsonify({
            'success': True,
            'data': info,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@api_bp.route('/predict', methods=['POST'])
def predict_single():
    """
    Predict risk for a single student with LLM recommendations
    """
    try:
        if not predictor.model_loaded:
            init_models()
        
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type must be application/json',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        data = request.get_json()
        
        numeric_features = current_app.config['NUMERIC_FEATURES']
        categorical_features = current_app.config['CATEGORICAL_FEATURES']
        required_features = numeric_features + categorical_features
        
        missing_features = [f for f in required_features if f not in data]
        
        if missing_features:
            return jsonify({
                'success': False,
                'error': 'Missing required features',
                'missing_features': missing_features,
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        student_id = data.get('student_id', None)
        
        # Get ML prediction
        prediction_result = predictor.predict(data)
        
        # Generate LLM recommendations
        from app.llm_service import llm_service
        llm_recommendations = llm_service.generate_recommendations(
            student_data=data,
            prediction_result=prediction_result,
            student_id=student_id
        )
        
        prediction_result['recommendations'] = llm_recommendations
        
        response = {
            'success': True,
            'student_id': student_id,
            'prediction': prediction_result,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Prediction with LLM recommendations successful for student: {student_id}")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@api_bp.route('/features', methods=['GET'])
def get_features():
    """
    Get list of required features
    """
    try:
        features = {
            'numeric_features': current_app.config['NUMERIC_FEATURES'],
            'categorical_features': current_app.config['CATEGORICAL_FEATURES'],
            'total_features': len(current_app.config['ALL_FEATURES'])
        }
        
        return jsonify({
            'success': True,
            'data': features,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error getting features: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@api_bp.route('/sample', methods=['GET'])
def get_sample_data():
    """
    Get sample student data for testing
    """
    sample_students = [
        {
            'description': 'Low-risk student',
            'data': {
                'student_id': 'SAMPLE_001',
                'total_clicks': 5000,
                'avg_clicks_per_day': 50,
                'clicks_std': 25,
                'max_clicks_single_day': 150,
                'days_active': 100,
                'study_span_days': 120,
                'engagement_regularity': 0.5,
                'pre_course_clicks': 200,
                'avg_score': 75,
                'score_std': 10,
                'min_score': 60,
                'max_score': 90,
                'completion_rate': 0.9,
                'first_score': 70,
                'score_improvement': 20,
                'avg_days_early': 2,
                'timing_consistency': 3,
                'worst_delay': -1,
                'late_submission_count': 1,
                'num_of_prev_attempts': 0,
                'studied_credits': 60,
                'early_registration': 1,
                'withdrew': 0,
                'gender': 'M',
                'age_band': '0-35',
                'highest_education': 'A Level or Equivalent',
                'disability': 'N'
            }
        },
        {
            'description': 'High-risk student',
            'data': {
                'student_id': 'SAMPLE_002',
                'total_clicks': 500,
                'avg_clicks_per_day': 5,
                'clicks_std': 10,
                'max_clicks_single_day': 30,
                'days_active': 30,
                'study_span_days': 100,
                'engagement_regularity': 2.0,
                'pre_course_clicks': 0,
                'avg_score': 35,
                'score_std': 15,
                'min_score': 20,
                'max_score': 50,
                'completion_rate': 0.4,
                'first_score': 30,
                'score_improvement': 20,
                'avg_days_early': -3,
                'timing_consistency': 10,
                'worst_delay': -10,
                'late_submission_count': 5,
                'num_of_prev_attempts': 2,
                'studied_credits': 60,
                'early_registration': 0,
                'withdrew': 0,
                'gender': 'F',
                'age_band': '35-55',
                'highest_education': 'Lower Than A Level',
                'disability': 'N'
            }
        }
    ]
    
    return jsonify({
        'success': True,
        'samples': sample_students,
        'usage': 'Copy the "data" object and POST to /api/predict',
        'timestamp': datetime.utcnow().isoformat()
    }), 200