import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGODB_URI = os.getenv('MONGODB_URI')
    PORT = int(os.getenv('PORT', 5002))
    DEBUG = os.getenv('FLASK_ENV') == 'development'
    
    # Model hyperparameters
    LGBM_PARAMS = {
        'objective': 'regression',
        'metric': 'rmse',
        'boosting_type': 'gbdt',
        'num_leaves': 15,
        'learning_rate': 0.05,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'min_data_in_leaf': 5,
        'max_depth': 4
    }
    
    ISOLATION_FOREST_PARAMS = {
        'contamination': 0.08,
        'random_state': 42,
        'n_estimators': 100
    }
    
    # Heatmap settings
    DEFAULT_LOOKBACK_DAYS = 182
    DEFAULT_FORECAST_DAYS = 14
    MIN_TRAINING_SAMPLES = 10
