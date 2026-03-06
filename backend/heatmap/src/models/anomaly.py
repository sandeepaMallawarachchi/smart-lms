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
    
    def detect(self, activity_counts, prediction_flags=None):
        """
        Detect anomalies in a stable way for sparse educational activity.
        Rules:
        - never flag predicted days
        - evaluate historical days only
        - ignore zero-count days (common and expected)
        - use robust IQR bounds over non-zero historical counts
        """
        counts = np.array(activity_counts, dtype=float)
        if counts.size == 0:
            return np.array([], dtype=bool)

        historical_mask = np.ones(len(counts), dtype=bool)
        if prediction_flags is not None:
            prediction_flags = np.array(prediction_flags, dtype=bool)
            historical_mask = ~prediction_flags

        types = self._robust_outlier_types(counts, historical_mask)
        return types != 'none'

    def detect_types(self, activity_counts, prediction_flags=None):
        """
        Returns per-day anomaly type:
        - 'positive': unusually high activity
        - 'negative': unusually low activity
        - 'none': no anomaly
        """
        counts = np.array(activity_counts, dtype=float)
        if counts.size == 0:
            return np.array([], dtype='<U8')

        historical_mask = np.ones(len(counts), dtype=bool)
        if prediction_flags is not None:
            prediction_flags = np.array(prediction_flags, dtype=bool)
            historical_mask = ~prediction_flags

        return self._robust_outlier_types(counts, historical_mask)
    
    def _statistical_outliers(self, counts):
        if len(counts) == 0:
            return np.array([], dtype=bool)
        
        mean = np.mean(counts)
        std = np.std(counts)
        
        lower = max(0, mean - 2 * std)
        upper = mean + 2 * std
        
        return (counts < lower) | (counts > upper)

    def _robust_outlier_types(self, counts, historical_mask):
        anomaly_types = np.array(['none'] * len(counts), dtype='<U8')

        historical_counts = counts[historical_mask]
        non_zero = historical_counts[historical_counts > 0]
        if len(non_zero) < 8:
            return anomaly_types

        q1 = np.percentile(non_zero, 25)
        q3 = np.percentile(non_zero, 75)
        iqr = q3 - q1

        # Fallback when spread is too tight.
        if iqr <= 0:
            upper = np.percentile(non_zero, 95)
            lower = np.percentile(non_zero, 5)
        else:
            lower = max(0, q1 - 1.5 * iqr)
            upper = q3 + 1.5 * iqr

        for idx, value in enumerate(counts):
            if not historical_mask[idx]:
                continue
            if value <= 0:
                continue
            if value > upper:
                anomaly_types[idx] = 'positive'
            elif value < lower:
                anomaly_types[idx] = 'negative'

        return anomaly_types
