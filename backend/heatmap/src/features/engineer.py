from datetime import datetime, timedelta
import numpy as np

class FeatureEngineer:
    def create_features(self, target_date, history, context):
        temporal = self._temporal_features(target_date, history, context['semester_start'])
        contextual = self._contextual_features(target_date, context)
        
        return {**temporal, **contextual}
    
    def create_matrix(self, dates, history, context):
        features = [self.create_features(d, history, context) for d in dates]
        if not features:
            return np.array([]), []
        
        feature_names = list(features[0].keys())
        matrix = np.array([[f[k] for k in feature_names] for f in features])
        
        return matrix, feature_names
    
    def _temporal_features(self, date, history, semester_start):
        day_of_week = date.weekday()
        
        # Rolling averages
        rolling_7d = self._rolling_avg(date, history, 7)
        rolling_14d = self._rolling_avg(date, history, 14)
        rolling_30d = self._rolling_avg(date, history, 30)
        
        # Trend
        trend_7d = self._trend(date, history, 7)
        
        # Lags
        lag_1d = history.get((date - timedelta(days=1)).strftime('%Y-%m-%d'), 0)
        lag_7d = history.get((date - timedelta(days=7)).strftime('%Y-%m-%d'), 0)
        
        # Semester phase
        weeks_since_start = ((date - semester_start).days // 7) + 1
        phase = self._semester_phase(weeks_since_start)
        
        return {
            'day_of_week': day_of_week,
            'is_weekend': int(day_of_week >= 5),
            'is_monday': int(day_of_week == 0),
            'week_of_month': (date.day - 1) // 7 + 1,
            'day_of_month': date.day,
            'weeks_since_semester_start': weeks_since_start,
            'is_early_semester': int(phase == 'early'),
            'is_mid_semester': int(phase == 'mid'),
            'is_late_semester': int(phase == 'late'),
            'is_exam_period': int(phase == 'exam'),
            'rolling_avg_7d': rolling_7d,
            'rolling_avg_14d': rolling_14d,
            'rolling_avg_30d': rolling_30d,
            'trend_7d': trend_7d,
            'activity_lag_1d': lag_1d,
            'activity_lag_7d': lag_7d,
            'day_sin': np.sin(2 * np.pi * day_of_week / 7),
            'day_cos': np.cos(2 * np.pi * day_of_week / 7)
        }
    
    def _contextual_features(self, date, context):
        deadlines = context.get('deadlines', [])
        active_projects = context.get('active_projects', 0)
        
        days_to_deadline = min([(d - date).days for d in deadlines if d >= date], default=999)
        deadlines_next_week = sum(1 for d in deadlines if 0 <= (d - date).days <= 7)
        deadlines_next_month = sum(1 for d in deadlines if 0 <= (d - date).days <= 30)
        
        return {
            'days_to_nearest_deadline': min(days_to_deadline, 999),
            'has_deadline_this_week': int(days_to_deadline <= 7),
            'has_deadline_tomorrow': int(days_to_deadline <= 1),
            'deadlines_next_week': deadlines_next_week,
            'deadlines_next_month': deadlines_next_month,
            'active_projects_count': active_projects,
            'estimated_workload': active_projects * 2
        }
    
    def _rolling_avg(self, target_date, history, window):
        start = target_date - timedelta(days=window)
        total = sum(history.get((start + timedelta(days=i)).strftime('%Y-%m-%d'), 0) 
                   for i in range(window))
        return total / window
    
    def _trend(self, target_date, history, window):
        start = target_date - timedelta(days=window)
        x = list(range(window))
        y = [history.get((start + timedelta(days=i)).strftime('%Y-%m-%d'), 0) for i in range(window)]
        
        if len([v for v in y if v > 0]) < 3:
            return 0.0
        
        return float(np.polyfit(x, y, 1)[0])
    
    def _semester_phase(self, weeks):
        if weeks <= 4:
            return 'early'
        elif weeks <= 10:
            return 'mid'
        elif weeks <= 14:
            return 'late'
        else:
            return 'exam'