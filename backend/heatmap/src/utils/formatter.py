import numpy as np

def map_to_level(activity_count, thresholds=[1, 3, 6, 10]):
    if activity_count == 0:
        return 0
    elif activity_count < thresholds[0]:
        return 1
    elif activity_count < thresholds[1]:
        return 2
    elif activity_count < thresholds[2]:
        return 3
    else:
        return 4

def adaptive_thresholds(activity_counts):
    if not activity_counts or all(c == 0 for c in activity_counts):
        return [1, 3, 6, 10]
    
    non_zero = [c for c in activity_counts if c > 0]
    if len(non_zero) < 4:
        return [1, 3, 6, 10]
    
    percentiles = np.percentile(non_zero, [25, 50, 75, 90])
    return [max(1, percentiles[0]), max(2, percentiles[1]), 
            max(3, percentiles[2]), max(4, percentiles[3])]

def format_response(dates, counts, levels, anomalies=None, predictions=None):
    if anomalies is None:
        anomalies = [False] * len(dates)
    if predictions is None:
        predictions = [False] * len(dates)
    
    heatmap = [
        {
            'date': dates[i],
            'count': round(counts[i], 2),
            'level': levels[i],
            'isPrediction': predictions[i],
            'isAnomaly': anomalies[i]
        }
        for i in range(len(dates))
    ]
    
    actual_counts = [c for i, c in enumerate(counts) if not predictions[i]]
    
    return {
        'heatmap': heatmap,
        'summary': {
            'totalDays': len(dates),
            'totalActivities': round(sum(counts), 2),
            'averageDaily': round(np.mean(counts), 2) if counts else 0,
            'maxDaily': round(max(counts), 2) if counts else 0,
            'activeDays': sum(1 for c in counts if c > 0),
            'anomalyCount': sum(anomalies),
            'predictedDays': sum(predictions)
        }
    }