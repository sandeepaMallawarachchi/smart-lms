import os
import logging
from flask import Flask
from flask_cors import CORS
from datetime import datetime

def create_app():
    """
    Create and configure Flask application
    """
    app = Flask(__name__)
    
    app.config.from_object('app.config.Config')
    
    cors_origins = os.getenv('CORS_ORIGINS', '*').split(',')
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})
    
    setup_logging(app)
    
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/')
    def index():
        return {
            'message': 'Learning Analytics API',
            'version': '1.0.0',
            'status': 'active',
            'endpoints': {
                'health': '/api/health',
                'predict': '/api/predict',
                'batch_predict': '/api/predict/batch',
                'model_info': '/api/model/info'
            },
            'timestamp': datetime.utcnow().isoformat()
        }
    
    app.logger.info('Flask application created successfully')
    
    return app


def setup_logging(app):
    """
    Configure application logging
    """
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    log_file = os.getenv('LOG_FILE', 'logs/app.log')
    
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    
    app.logger.setLevel(getattr(logging, log_level))