import os
import joblib
import pandas as pd
import numpy as np
from flask import current_app
import logging

logger = logging.getLogger(__name__)


class ModelPredictor:
    """
    Handles model loading and prediction operations
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoders = None
        self.model_loaded = False
        self.model_degraded = False
    
    
    def load_models(self):
        """
        Load trained model, scaler, and encoders
        """
        try:
            model_path = current_app.config['MODEL_PATH']
            scaler_path = current_app.config['SCALER_PATH']
            encoders_path = current_app.config['ENCODERS_PATH']
            
            logger.info(f"Loading model from {model_path}")
            self.model = joblib.load(model_path)
            
            logger.info(f"Loading scaler from {scaler_path}")
            self.scaler = joblib.load(scaler_path)
            
            logger.info(f"Loading encoders from {encoders_path}")
            self.label_encoders = joblib.load(encoders_path)
            
            self.model_loaded = True
            self.model_degraded = self._detect_model_degradation()
            if self.model_degraded:
                logger.warning("Model quality check failed. Falling back to heuristic risk scoring.")
            logger.info("All models loaded successfully")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            self.model_loaded = False
            raise Exception(f"Failed to load models: {str(e)}")

    def _encode_feature_row(self, student_data):
        """
        Build unscaled model feature row in training feature order
        """
        all_features = current_app.config['ALL_FEATURES']
        categorical_features = current_app.config['CATEGORICAL_FEATURES']
        df = pd.DataFrame([student_data])

        for col in categorical_features:
            if col in self.label_encoders:
                encoded_col = col + '_encoded'
                try:
                    df[encoded_col] = self.label_encoders[col].transform(df.get(col, pd.Series([''])).astype(str))
                except Exception:
                    df[encoded_col] = 0

        feature_values = []
        for feature in all_features:
            if feature in df.columns:
                feature_values.append(df[feature].values[0])
            else:
                feature_values.append(0)

        return np.array(feature_values).reshape(1, -1)

    def _get_model_risk_probability(self, features_scaled):
        """
        Return probability of at-risk class (label 1) robustly.
        """
        probability = self.model.predict_proba(features_scaled)[0]
        classes = getattr(self.model, "classes_", None)

        if classes is not None and 1 in classes:
            class_index = int(np.where(classes == 1)[0][0])
        else:
            # Fallback: keep backward compatibility with binary models
            class_index = 1 if len(probability) > 1 else 0

        return float(probability[class_index]), probability

    def _heuristic_risk_probability(self, student_data):
        """
        Fallback risk score when model is unstable for current deployment inputs.
        """
        completion_rate = float(student_data.get('completion_rate', 0) or 0)
        late_submission_count = float(student_data.get('late_submission_count', 0) or 0)
        avg_clicks_per_day = float(student_data.get('avg_clicks_per_day', 0) or 0)
        days_active = float(student_data.get('days_active', 0) or 0)
        study_span_days = float(student_data.get('study_span_days', 0) or 0)
        avg_score = student_data.get('avg_score', None)

        completion_risk = max(0.0, min(1.0, 1.0 - completion_rate))
        late_risk = max(0.0, min(1.0, late_submission_count / 6.0))
        click_risk = max(0.0, min(1.0, 1.0 - (avg_clicks_per_day / 2.0)))
        activity_ratio = (days_active / study_span_days) if study_span_days > 0 else 0
        consistency_risk = max(0.0, min(1.0, 1.0 - activity_ratio))

        if avg_score is None:
            score_risk = 0.5
        else:
            avg_score = float(avg_score or 0)
            score_risk = max(0.0, min(1.0, 1.0 - (avg_score / 100.0)))

        weighted = (
            0.40 * completion_risk +
            0.20 * late_risk +
            0.15 * click_risk +
            0.10 * consistency_risk +
            0.15 * score_risk
        )
        return float(max(0.0, min(1.0, weighted)))

    def _detect_model_degradation(self):
        """
        Basic sanity check to detect obviously broken model artifacts at runtime.
        """
        try:
            low_risk_sample = {
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
            high_risk_sample = {
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

            low_scaled = self.scaler.transform(self._encode_feature_row(low_risk_sample))
            high_scaled = self.scaler.transform(self._encode_feature_row(high_risk_sample))
            low_prob, _ = self._get_model_risk_probability(low_scaled)
            high_prob, _ = self._get_model_risk_probability(high_scaled)

            # Model considered degraded if it cannot separate canonical low/high profiles.
            if not (low_prob < high_prob and low_prob < 0.7):
                logger.warning(
                    "Model sanity check failed: low_prob=%.3f high_prob=%.3f",
                    low_prob, high_prob
                )
                return True

            return False
        except Exception as e:
            logger.warning("Model sanity check error: %s", str(e))
            return True
    
    
    def preprocess_features(self, student_data):
        """
        Preprocess student data for prediction
        """
        try:
            numeric_features = current_app.config['NUMERIC_FEATURES']
            categorical_features = current_app.config['CATEGORICAL_FEATURES']
            
            df = pd.DataFrame([student_data])
            for col in categorical_features:
                if col not in df.columns and col in self.label_encoders:
                    logger.warning(f"Categorical feature {col} missing. Using default encoder value 0")

            features_array = self._encode_feature_row(student_data)
            features_scaled = self.scaler.transform(features_array)
            
            return features_scaled
            
        except Exception as e:
            logger.error(f"Error preprocessing features: {str(e)}")
            raise Exception(f"Feature preprocessing failed: {str(e)}")
    
    
    def predict(self, student_data):
        """
        Make prediction for a single student
        """
        try:
            if not self.model_loaded:
                raise Exception("Models not loaded. Call load_models() first")
            
            features = self.preprocess_features(student_data)
            
            model_risk_prob, probability = self._get_model_risk_probability(features)
            heuristic_risk_prob = self._heuristic_risk_probability(student_data)

            if self.model_degraded:
                risk_prob = heuristic_risk_prob
                confidence = round(float(0.5 + abs(risk_prob - 0.5)), 3)
                prediction_mode = 'heuristic_fallback'
            else:
                # Blend model + heuristic to reduce unstable extremes with sparse live data
                risk_prob = (0.7 * model_risk_prob) + (0.3 * heuristic_risk_prob)
                predicted_class = 1 if risk_prob >= current_app.config['RISK_THRESHOLD_MEDIUM'] else 0
                confidence = round(float(probability[predicted_class]), 3)
                prediction_mode = 'hybrid_model'

            prediction = 1 if risk_prob >= current_app.config['RISK_THRESHOLD_MEDIUM'] else 0
            risk_level = self._get_risk_level(risk_prob)
            risk_factors = self._identify_risk_factors(student_data)
            recommendations = self._generate_recommendations(risk_level, risk_factors)
            
            result = {
                'at_risk': bool(prediction),
                'risk_probability': round(float(risk_prob), 3),
                'confidence': confidence,
                'risk_level': risk_level,
                'prediction_mode': prediction_mode,
                'risk_factors': risk_factors,
                'recommendations': recommendations
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise Exception(f"Prediction failed: {str(e)}")
    
    
    def predict_batch(self, students_data):
        """
        Make predictions for multiple students
        """
        results = []
        
        for student_data in students_data:
            try:
                prediction = self.predict(student_data)
                student_id = student_data.get('student_id', None)
                
                results.append({
                    'student_id': student_id,
                    'prediction': prediction,
                    'status': 'success'
                })
                
            except Exception as e:
                logger.error(f"Error predicting for student: {str(e)}")
                results.append({
                    'student_id': student_data.get('student_id', None),
                    'prediction': None,
                    'status': 'error',
                    'error': str(e)
                })
        
        return results
    
    
    def _get_risk_level(self, risk_prob):
        """
        Determine risk level based on probability
        """
        high_threshold = current_app.config['RISK_THRESHOLD_HIGH']
        medium_threshold = current_app.config['RISK_THRESHOLD_MEDIUM']
        
        if risk_prob >= high_threshold:
            return 'high'
        elif risk_prob >= medium_threshold:
            return 'medium'
        else:
            return 'low'
    
    
    def _identify_risk_factors(self, student_data):
        """
        Identify specific risk factors from student data
        """
        risk_factors = []
        
        if student_data.get('total_clicks', 0) < 2000:
            risk_factors.append({
                'factor': 'low_engagement',
                'description': 'Low total VLE interaction',
                'value': student_data.get('total_clicks', 0),
                'severity': 'high'
            })
        
        if student_data.get('avg_clicks_per_day', 0) < 20:
            risk_factors.append({
                'factor': 'low_daily_activity',
                'description': 'Low average daily clicks',
                'value': student_data.get('avg_clicks_per_day', 0),
                'severity': 'medium'
            })
        
        if student_data.get('avg_score', 100) < 50:
            risk_factors.append({
                'factor': 'low_performance',
                'description': 'Low average assessment score',
                'value': student_data.get('avg_score', 0),
                'severity': 'high'
            })
        
        if student_data.get('completion_rate', 1.0) < 0.7:
            risk_factors.append({
                'factor': 'low_completion',
                'description': 'Low assessment completion rate',
                'value': student_data.get('completion_rate', 0),
                'severity': 'high'
            })
        
        if student_data.get('late_submission_count', 0) > 3:
            risk_factors.append({
                'factor': 'frequent_late_submissions',
                'description': 'Multiple late submissions',
                'value': student_data.get('late_submission_count', 0),
                'severity': 'medium'
            })
        
        if student_data.get('num_of_prev_attempts', 0) > 0:
            risk_factors.append({
                'factor': 'previous_attempts',
                'description': 'Student has previously attempted this course',
                'value': student_data.get('num_of_prev_attempts', 0),
                'severity': 'medium'
            })
        
        return risk_factors
    
    
    def _generate_recommendations(self, risk_level, risk_factors):
        """
        Generate personalized recommendations using LLM
        """
        return ["Recommendations will be generated by LLM service"]
    
    def get_model_info(self):
        """
        Get information about loaded models
        """
        if not self.model_loaded:
            return {'status': 'Models not loaded'}
        
        info = {
            'model_type': type(self.model).__name__,
            'model_loaded': self.model_loaded,
            'model_degraded': self.model_degraded,
            'n_features': len(current_app.config['ALL_FEATURES']),
            'features': {
                'numeric': current_app.config['NUMERIC_FEATURES'],
                'categorical': current_app.config['CATEGORICAL_FEATURES']
            },
            'risk_thresholds': {
                'high': current_app.config['RISK_THRESHOLD_HIGH'],
                'medium': current_app.config['RISK_THRESHOLD_MEDIUM'],
                'low': current_app.config['RISK_THRESHOLD_LOW']
            }
        }
        
        return info


predictor = ModelPredictor()
