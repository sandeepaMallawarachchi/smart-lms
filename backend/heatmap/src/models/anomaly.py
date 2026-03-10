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
        if len(non_zero) < 3:
            return anomaly_types

        median = float(np.median(non_zero))
        mad = float(np.median(np.abs(non_zero - median)))
        q1 = np.percentile(non_zero, 25)
        q3 = np.percentile(non_zero, 75)
        iqr = q3 - q1

        # Build conservative-but-usable bounds for sparse educational activity.
        if iqr <= 0:
            upper = float(np.percentile(non_zero, 90))
            lower = float(np.percentile(non_zero, 10))
        else:
            lower = float(max(0, q1 - 1.5 * iqr))
            upper = float(q3 + 1.5 * iqr)

        # Sparse histories need a stronger ratio-based fallback or obvious spikes
        # such as [1, 1, 1, 8] can be missed entirely.
        sparse_upper = float(max(median * 2.5, median + 3))
        sparse_lower = float(max(1, median * 0.4))

        for idx, value in enumerate(counts):
            if not historical_mask[idx]:
                continue
            if value <= 0:
                continue

            is_positive = False
            is_negative = False

            if len(non_zero) < 6:
                # For sparse histories, prefer the more sensitive bound.
                positive_threshold = min(upper, sparse_upper) if upper > 0 else sparse_upper
                negative_threshold = max(lower, sparse_lower)
                is_positive = value >= positive_threshold and value > median
                is_negative = value <= negative_threshold and value < median
            else:
                if len(non_zero) < 12:
                    positive_threshold = min(upper, sparse_upper) if upper > 0 else sparse_upper
                    negative_threshold = max(lower, sparse_lower)
                    if mad > 0:
                        modified_z = 0.6745 * (value - median) / mad
                        is_positive = modified_z >= 3.0 or (value >= positive_threshold and value > median)
                        is_negative = modified_z <= -3.0 or (value <= negative_threshold and value < median)
                    else:
                        is_positive = value >= positive_threshold and value > median
                        is_negative = value <= negative_threshold and value < median
                elif mad > 0:
                    modified_z = 0.6745 * (value - median) / mad
                    is_positive = modified_z >= 3.5 or value >= max(upper, median * 2.0)
                    is_negative = modified_z <= -3.5 or (value <= lower and value < median)
                else:
                    is_positive = value >= max(upper, median * 2.0, median + 3)
                    is_negative = value <= min(lower, max(1, median * 0.5)) and value < median

            if is_positive:
                anomaly_types[idx] = 'positive'
            elif is_negative:
                anomaly_types[idx] = 'negative'

        return anomaly_types
