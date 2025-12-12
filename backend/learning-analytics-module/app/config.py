import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """
    Base configuration class
    """
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    TESTING = False
    
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', 5000))
    
    MODEL_PATH = os.getenv('MODEL_PATH', 'models/best_model_lightgbm.pkl')
    SCALER_PATH = os.getenv('SCALER_PATH', 'models/scaler.pkl')
    ENCODERS_PATH = os.getenv('ENCODERS_PATH', 'models/label_encoders.pkl')
    
    RISK_THRESHOLD_HIGH = float(os.getenv('RISK_THRESHOLD_HIGH', 0.7))
    RISK_THRESHOLD_MEDIUM = float(os.getenv('RISK_THRESHOLD_MEDIUM', 0.4))
    RISK_THRESHOLD_LOW = float(os.getenv('RISK_THRESHOLD_LOW', 0.0))
    
    NUMERIC_FEATURES = [
        'total_clicks', 'avg_clicks_per_day', 'clicks_std', 'max_clicks_single_day',
        'days_active', 'study_span_days', 'engagement_regularity', 'pre_course_clicks',
        'avg_score', 'score_std', 'min_score', 'max_score', 'completion_rate',
        'first_score', 'score_improvement', 'avg_days_early', 'timing_consistency',
        'worst_delay', 'late_submission_count', 'num_of_prev_attempts',
        'studied_credits', 'early_registration', 'withdrew'
    ]
    
    CATEGORICAL_FEATURES = ['gender', 'age_band', 'highest_education', 'disability']
    
    ALL_FEATURES = NUMERIC_FEATURES + [f + '_encoded' for f in CATEGORICAL_FEATURES]


class DevelopmentConfig(Config):
    """
    Development configuration
    """
    DEBUG = True


class ProductionConfig(Config):
    """
    Production configuration
    """
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """
    Testing configuration
    """
    TESTING = True
    DEBUG = True


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}