from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import numpy as np

from config import Config
from src.data.loader import DataLoader
from src.features.engineer import FeatureEngineer
from src.models.predictor import ActivityPredictor
from src.models.anomaly import AnomalyDetector
from src.utils.formatter import map_to_level, adaptive_thresholds, format_response

app = Flask(__name__)
CORS(app)

data_loader = DataLoader()
feature_engineer = FeatureEngineer()
activity_predictor = ActivityPredictor()
anomaly_detector = AnomalyDetector()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'heatmap-ml', 'version': '1.0.0'})

@app.route('/heatmap', methods=['POST'])
def generate_heatmap():
    try:
        data = request.json
        student_id = data.get('studentId')
        lookback = data.get('lookbackDays', Config.DEFAULT_LOOKBACK_DAYS)
        forecast = data.get('forecastDays', Config.DEFAULT_FORECAST_DAYS)
        
        if not student_id:
            return jsonify({'error': 'studentId required'}), 400
        
        # Load data
        history = data_loader.get_activity_history(student_id, lookback)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=lookback)
        
        context = {
            'deadlines': data_loader.get_deadlines(student_id),
            'active_projects': data_loader.get_active_projects(student_id),
            'semester_start': data_loader.get_semester_start(student_id)
        }
        
        # Training dates (past only)
        training_dates = [start_date + timedelta(days=i) 
                         for i in range((min(end_date, datetime.now()) - start_date).days + 1)]
        
        # Create training data
        X_train, feature_names = feature_engineer.create_matrix(training_dates, history, context)
        y_train = np.array([history.get(d.strftime('%Y-%m-%d'), 0) for d in training_dates])
        
        # Train models
        if X_train.shape[0] > 0:
            activity_predictor.fit(X_train, y_train, feature_names)
            anomaly_detector.fit(y_train)
        
        # All dates (history + forecast)
        all_dates = [start_date + timedelta(days=i) 
                    for i in range((end_date + timedelta(days=forecast) - start_date).days + 1)]
        
        # Create features for all dates
        X_all, _ = feature_engineer.create_matrix(all_dates, history, context)
        
        # Predict
        predicted_counts = activity_predictor.predict(X_all) if X_all.shape[0] > 0 else np.zeros(len(all_dates))
        
        # Detect anomalies
        anomaly_flags = anomaly_detector.detect(predicted_counts)
        
        # Prediction flags
        today = datetime.now().date()
        prediction_flags = [d.date() > today for d in all_dates]
        
        # Adaptive thresholds
        thresholds = adaptive_thresholds([history.get(d.strftime('%Y-%m-%d'), 0) for d in training_dates])
        
        # Map to levels
        levels = [map_to_level(c, thresholds) for c in predicted_counts]
        
        # Format response
        date_strings = [d.strftime('%Y-%m-%d') for d in all_dates]
        response = format_response(
            dates=date_strings,
            counts=predicted_counts.tolist(),
            levels=levels,
            anomalies=anomaly_flags.tolist(),
            predictions=prediction_flags
        )
        
        # Add metadata
        response['model_info'] = {
            'prediction_enabled': activity_predictor.is_fitted,
            'anomaly_detection_enabled': anomaly_detector.is_fitted,
            'forecast_days': forecast,
            'training_samples': len(training_dates),
            'feature_count': len(feature_names) if feature_names else 0
        }
        
        if activity_predictor.is_fitted:
            response['feature_importance'] = activity_predictor.get_importance()
        
        return jsonify(response)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/diagnostics', methods=['POST'])
def diagnostics():
    try:
        return jsonify({
            'predictor': {
                'is_fitted': activity_predictor.is_fitted,
                'model_type': 'LightGBM' if activity_predictor.model else 'Fallback'
            },
            'anomaly_detector': {
                'is_fitted': anomaly_detector.is_fitted,
                'contamination': Config.ISOLATION_FOREST_PARAMS['contamination']
            },
            'data_loader': {
                'status': 'active',
                'database': 'connected'
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print(f"Heatmap service")
    print(f"Port: {Config.PORT}")
    print(f"Debug: {Config.DEBUG}")
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)