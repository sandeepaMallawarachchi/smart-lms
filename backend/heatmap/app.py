from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import numpy as np

from config import Config
from src.data.loader import DataLoader
from src.features.engineer import FeatureEngineer
from src.models.predictor import ActivityPredictor
from src.models.anomaly import AnomalyDetector
from src.utils.formatter import map_to_level, adaptive_thresholds

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

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
        lookback_days = int(data.get('lookbackDays', Config.DEFAULT_LOOKBACK_DAYS))
        forecast_days = int(data.get('forecastDays', Config.DEFAULT_FORECAST_DAYS))
        
        if not student_id:
            return jsonify({'error': 'studentId required'}), 400

        # Constrain runtime windows to sane limits
        lookback_days = max(30, min(lookback_days, 366))
        forecast_days = max(0, min(forecast_days, 30))
        
        now = datetime.now()
        today = now.date()
        start_date = datetime.combine(today - timedelta(days=lookback_days - 1), datetime.min.time())
        end_date = datetime.combine(today + timedelta(days=forecast_days), datetime.min.time())
        
        # Get activity history with items
        activity_history = data_loader.get_activity_history(student_id, days=lookback_days)
        
        context = {
            'deadlines': data_loader.get_deadlines(student_id),
            'active_projects': data_loader.get_active_projects(student_id),
            'semester_start': data_loader.get_semester_start(student_id)
        }
        
        # Build all dates in the configured window
        all_dates = []
        current = start_date
        while current <= end_date:
            all_dates.append(current)
            current += timedelta(days=1)
        
        # Split into past and future
        past_dates = [d for d in all_dates if d.date() <= today]
        
        # Extract actual counts for past dates
        y_train = np.array([activity_history.get(d.strftime('%Y-%m-%d'), {}).get('count', 0) for d in past_dates])
        
        # Create features and train models
        X_all, feature_names = feature_engineer.create_matrix(all_dates, activity_history, context)
        
        if len(past_dates) >= Config.MIN_TRAINING_SAMPLES:
            X_train = X_all[:len(past_dates)]
            activity_predictor.fit(X_train, y_train, feature_names)
            anomaly_detector.fit(y_train)
        
        # Predict all dates
        predicted_counts = activity_predictor.predict(X_all) if X_all.shape[0] > 0 else np.zeros(len(all_dates))
        
        # For past dates, use ACTUAL counts; for future, use PREDICTIONS
        final_counts = []
        for i, date in enumerate(all_dates):
            if date.date() <= today:
                # Use actual count from database
                final_counts.append(activity_history.get(date.strftime('%Y-%m-%d'), {}).get('count', 0))
            else:
                # Use ML prediction
                final_counts.append(predicted_counts[i])
        
        final_counts = np.array(final_counts)
        
        # Detect anomalies
        anomaly_flags = anomaly_detector.detect(final_counts)
        
        # Prediction flags
        prediction_flags = [d.date() > today for d in all_dates]
        
        # Adaptive thresholds based on actual past data
        past_counts = [activity_history.get(d.strftime('%Y-%m-%d'), {}).get('count', 0) for d in past_dates]
        thresholds = adaptive_thresholds(past_counts)
        
        # Map to levels
        levels = [map_to_level(c, thresholds) for c in final_counts]
        
        # Build heatmap with items
        heatmap = []
        for i, date in enumerate(all_dates):
            date_str = date.strftime('%Y-%m-%d')
            items = activity_history.get(date_str, {}).get('items', [])
            
            heatmap.append({
                'date': date_str,
                'count': float(final_counts[i]),
                'level': int(levels[i]),
                'isPrediction': bool(prediction_flags[i]),
                'isAnomaly': bool(anomaly_flags[i]),
                'items': items if not prediction_flags[i] else []
            })
        
        # Calculate summary
        actual_activities = sum(activity_history.get(d.strftime('%Y-%m-%d'), {}).get('count', 0) for d in past_dates)
        
        response = {
            'heatmap': heatmap,
            'summary': {
                'totalDays': int(len(all_dates)),
                'totalActivities': float(actual_activities),
                'averageDaily': float(np.mean([h['count'] for h in heatmap if not h['isPrediction']])),
                'maxDaily': float(max([h['count'] for h in heatmap if not h['isPrediction']])) if any(not h['isPrediction'] for h in heatmap) else 0.0,
                'activeDays': int(sum(1 for h in heatmap if h['count'] > 0 and not h['isPrediction'])),
                'anomalyCount': int(sum(anomaly_flags)),
                'predictedDays': int(sum(prediction_flags))
            },
            'model_info': {
                'prediction_enabled': bool(activity_predictor.is_fitted),
                'anomaly_detection_enabled': bool(anomaly_detector.is_fitted),
                'forecast_days': int(sum(prediction_flags)),
                'training_samples': int(len(past_dates)),
                'feature_count': int(len(feature_names)) if feature_names else 0
            }
        }
        
        if activity_predictor.is_fitted:
            importance = activity_predictor.get_importance()
            response['feature_importance'] = {k: float(v) for k, v in importance.items()}
        
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
    print(f"Heatmap ML Microservice")
    print(f"Port: {Config.PORT}")
    print(f"Debug: {Config.DEBUG}")
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
