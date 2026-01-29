import numpy as np
from config import Config

try:
    from sklearn.ensemble import IsolationForest
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.is_fitted = False
        self.params = Config.ISOLATION_FOREST_PARAMS
        
        if HAS_SKLEARN:
            self.model = IsolationForest(**self.params)
    
    def fit(self, activity_counts):
        if not HAS_SKLEARN or len(activity_counts) < 20:
            self.is_fitted = False
            return
        
        X = activity_counts.reshape(-1, 1)
        try:
            self.model.fit(X)
            self.is_fitted = True
        except:
            self.is_fitted = False
    
    def detect(self, activity_counts):
        if not self.is_fitted or not HAS_SKLEARN:
            return self._statistical_outliers(activity_counts)
        
        X = activity_counts.reshape(-1, 1)
        predictions = self.model.predict(X)
        return predictions == -1
    
    def _statistical_outliers(self, counts):
        if len(counts) == 0:
            return np.array([], dtype=bool)
        
        mean = np.mean(counts)
        std = np.std(counts)
        
        lower = max(0, mean - 2 * std)
        upper = mean + 2 * std
        
        return (counts < lower) | (counts > upper)