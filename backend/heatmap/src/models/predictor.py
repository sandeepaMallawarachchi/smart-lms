import numpy as np
from config import Config

try:
    import lightgbm as lgb
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False

class ActivityPredictor:
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.is_fitted = False
        self.params = Config.LGBM_PARAMS
    
    def fit(self, X, y, feature_names=None):
        if X.shape[0] < Config.MIN_TRAINING_SAMPLES:
            self.is_fitted = False
            return
        
        self.feature_names = feature_names
        
        if HAS_LGBM:
            train_data = lgb.Dataset(X, label=y, feature_name=feature_names)
            self.model = lgb.train(
                self.params,
                train_data,
                num_boost_round=100,
                valid_sets=[train_data],
                callbacks=[lgb.early_stopping(stopping_rounds=10, verbose=False)]
            )
            self.is_fitted = True
        else:
            self._fit_linear(X, y)
    
    def predict(self, X):
        if not self.is_fitted or self.model is None:
            return self._fallback(X)
        
        if HAS_LGBM and isinstance(self.model, lgb.Booster):
            preds = self.model.predict(X, num_iteration=self.model.best_iteration)
        else:
            preds = X @ self.weights + self.bias
        
        return np.maximum(preds, 0)
    
    def get_importance(self, top_n=8):
        if not self.is_fitted or not HAS_LGBM or not isinstance(self.model, lgb.Booster):
            return {}
        
        importance = self.model.feature_importance(importance_type='gain')
        feature_importance = dict(zip(self.feature_names, importance))
        
        return dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:top_n])
    
    def _fit_linear(self, X, y):
        X_bias = np.c_[np.ones(X.shape[0]), X]
        try:
            coeffs = np.linalg.lstsq(X_bias, y, rcond=None)[0]
            self.bias = coeffs[0]
            self.weights = coeffs[1:]
            self.is_fitted = True
        except:
            self.is_fitted = False
    
    def _fallback(self, X):
        if self.feature_names and 'rolling_avg_7d' in self.feature_names:
            idx = self.feature_names.index('rolling_avg_7d')
            return X[:, idx]
        return np.ones(X.shape[0]) * 2.0