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
            logger.info("All models loaded successfully")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            self.model_loaded = False
            raise Exception(f"Failed to load models: {str(e)}")
    
    
    def preprocess_features(self, student_data):
        """
        Preprocess student data for prediction
        """
        try:
            numeric_features = current_app.config['NUMERIC_FEATURES']
            categorical_features = current_app.config['CATEGORICAL_FEATURES']
            
            df = pd.DataFrame([student_data])
            
            for col in categorical_features:
                if col in df.columns and col in self.label_encoders:
                    encoded_col = col + '_encoded'
                    try:
                        df[encoded_col] = self.label_encoders[col].transform(df[col].astype(str))
                    except Exception as e:
                        logger.warning(f"Error encoding {col}: {str(e)}. Using default value 0")
                        df[encoded_col] = 0
            
            all_features = current_app.config['ALL_FEATURES']
            feature_values = []
            
            for feature in all_features:
                if feature in df.columns:
                    feature_values.append(df[feature].values[0])
                else:
                    logger.warning(f"Feature {feature} not found. Using 0 as default")
                    feature_values.append(0)
            
            features_array = np.array(feature_values).reshape(1, -1)
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
            
            prediction = self.model.predict(features)[0]
            probability = self.model.predict_proba(features)[0]
            
            risk_prob = probability[1]
            risk_level = self._get_risk_level(risk_prob)
            risk_factors = self._identify_risk_factors(student_data)
            recommendations = self._generate_recommendations(risk_level, risk_factors)
            
            result = {
                'at_risk': bool(prediction),
                'risk_probability': round(float(risk_prob), 3),
                'confidence': round(float(probability[prediction]), 3),
                'risk_level': risk_level,
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