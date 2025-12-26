"""
Intelligent Rule-Based Recommendation Service
No external models required - fast, reliable, and personalized
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMRecommendationService:
    """
    Generates personalized recommendations using intelligent rules
    """
    
    def __init__(self):
        self.student_history = {}
    
    
    def generate_recommendations(self, student_data, prediction_result, student_id=None):
        """
        Generate personalized recommendations based on student data and risk factors
        """
        try:
            logger.info("Generating intelligent recommendations...")
            
            risk_level = prediction_result.get('risk_level', 'medium')
            risk_factors = prediction_result.get('risk_factors', [])
            
            # Track student history for personalization
            if student_id:
                self._update_student_history(student_id, prediction_result)
            
            # Generate context-aware recommendations
            result = self._generate_personalized_recommendations(
                student_data, 
                prediction_result, 
                risk_factors,
                student_id
            )
            
            logger.info("✓ Recommendations generated successfully!")
            return result
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return self._basic_recommendations(prediction_result)
    
    
    def _generate_personalized_recommendations(self, student_data, prediction_result, risk_factors, student_id):
        """
        Generate highly personalized recommendations
        """
        risk_level = prediction_result.get('risk_level', 'medium')
        risk_prob = prediction_result.get('risk_probability', 0)
        
        # Check for improvement trend
        is_improving = False
        if student_id and student_id in self.student_history:
            history = self.student_history[student_id]
            if len(history) > 1:
                is_improving = history[-1]['risk_prob'] < history[-2]['risk_prob']
        
        # Build detailed explanation
        explanation = self._build_explanation(student_data, risk_level, risk_prob, risk_factors, is_improving)
        
        # Build specific action steps
        action_steps = self._build_action_steps(student_data, risk_factors, risk_level)
        
        # Build motivational message
        motivation = self._build_motivation(risk_level, is_improving, len(risk_factors))
        
        return {
            'explanation': explanation,
            'action_steps': action_steps,
            'motivation': motivation,
            'generated_at': datetime.utcnow().isoformat(),
            'source': 'intelligent_rules',
            'personalization_used': student_id is not None
        }
    
    
    def _build_explanation(self, data, risk_level, risk_prob, risk_factors, is_improving):
        """
        Build detailed, personalized explanation
        """
        total_clicks = data.get('total_clicks', 0)
        avg_score = data.get('avg_score', 0)
        completion_rate = data.get('completion_rate', 0)
        late_count = data.get('late_submission_count', 0)
        
        parts = []
        
        # Main risk assessment
        if risk_level == 'high':
            parts.append(f"You're currently at high risk ({risk_prob:.0%} probability) of academic difficulty.")
        elif risk_level == 'medium':
            parts.append(f"You're at moderate risk ({risk_prob:.0%} probability) and need to address some areas.")
        else:
            parts.append(f"You're performing well with low risk ({risk_prob:.0%} probability) of academic issues.")
        
        # Engagement analysis
        if total_clicks < 1500:
            parts.append(f"Your engagement is very low with only {total_clicks:,} platform interactions.")
        elif total_clicks < 3000:
            parts.append(f"Your engagement is moderate with {total_clicks:,} interactions, but consistency could improve.")
        else:
            parts.append(f"Your engagement is strong with {total_clicks:,} platform interactions.")
        
        # Performance analysis
        if avg_score < 50:
            parts.append(f"Your average score of {avg_score:.1f}% indicates you're struggling with course content.")
        elif avg_score < 70:
            parts.append(f"Your {avg_score:.1f}% average shows developing understanding that needs strengthening.")
        else:
            parts.append(f"Your {avg_score:.1f}% average demonstrates solid grasp of course material.")
        
        # Submission timing
        if late_count > 3:
            parts.append(f"Time management is a concern with {late_count} late submissions.")
        elif late_count > 0:
            parts.append(f"You have {late_count} late submission(s) - maintaining deadlines is important.")
        
        # Improvement trend
        if is_improving:
            parts.append("Positively, your recent patterns show improvement!")
        
        return ' '.join(parts)
    
    
    def _build_action_steps(self, data, risk_factors, risk_level):
        """
        Build specific, actionable steps based on analysis
        """
        steps = []
        factor_types = [f['factor'] for f in risk_factors]
        
        total_clicks = data.get('total_clicks', 0)
        avg_score = data.get('avg_score', 0)
        late_count = data.get('late_submission_count', 0)
        completion_rate = data.get('completion_rate', 0)
        
        # Engagement actions
        if total_clicks < 2000 or any('engagement' in f or 'click' in f or 'activity' in f for f in factor_types):
            if total_clicks < 1000:
                steps.append("Set a goal to log in daily and interact with course materials for at least 45 minutes")
                steps.append("Complete all unfinished course activities and watch remaining lecture videos")
            else:
                steps.append("Increase your daily platform activity to at least 30 minutes of focused study")
                steps.append("Engage with all available learning resources including forums and practice materials")
        
        # Performance actions
        if avg_score < 70 or any('performance' in f or 'score' in f for f in factor_types):
            if avg_score < 50:
                steps.append("Schedule urgent meetings with your instructor to discuss struggling topics")
                steps.append("Attend all tutoring sessions and form a study group with high-performing classmates")
                steps.append("Review and redo all previous assessments to identify knowledge gaps")
            else:
                steps.append("Review course content thoroughly before each assessment using active learning techniques")
                steps.append("Create summary notes and practice questions for challenging topics")
        
        # Completion actions
        if completion_rate < 0.7 or any('completion' in f for f in factor_types):
            steps.append("Prioritize completing all pending assessments immediately - focus on submission over perfection")
            steps.append("Break large assignments into smaller daily tasks with specific completion targets")
        
        # Timing actions
        if late_count > 2 or any('late' in f or 'timing' in f for f in factor_types):
            if late_count > 5:
                steps.append("Create a detailed weekly schedule with assignment deadlines highlighted and set multiple reminders")
                steps.append("Start every assignment the day it's assigned, even if just reading requirements")
            else:
                steps.append("Build a buffer by starting assignments 5-7 days before deadlines")
                steps.append("Use a calendar app with alerts set 3 days, 1 day, and 6 hours before each deadline")
        
        # Previous attempts
        if any('previous' in f or 'attempt' in f for f in factor_types):
            steps.append("Reflect on what didn't work in your previous attempt and create a new strategy")
            steps.append("Seek additional support resources that weren't used before")
        
        # General high-priority actions if specific ones don't apply
        if len(steps) == 0:
            if risk_level == 'high':
                steps.extend([
                    "Meet with your academic advisor immediately to create an action plan",
                    "Dedicate at least 2 hours daily to this course for the next two weeks",
                    "Eliminate distractions during study time and use focused study techniques"
                ])
            elif risk_level == 'medium':
                steps.extend([
                    "Increase your study time by 30 minutes per day",
                    "Actively participate in all class discussions and group activities",
                    "Complete practice problems and self-tests regularly"
                ])
            else:
                steps.extend([
                    "Maintain your current positive study habits and engagement level",
                    "Continue submitting work early and reviewing feedback carefully",
                    "Consider helping peers to reinforce your own understanding"
                ])
        
        # Ensure we have enough actionable steps
        if len(steps) < 3:
            steps.append("Check the course announcements and syllabus daily for any updates")
            steps.append("Reach out to your instructor if you're unsure about any requirements")
        
        return steps[:6]  # Return top 6 most relevant actions
    
    
    def _build_motivation(self, risk_level, is_improving, num_risk_factors):
        """
        Build encouraging, contextual motivation message
        """
        if is_improving:
            return "Great progress! Your recent improvements show you're capable of success. Keep up this positive momentum and stay consistent with your efforts!"
        
        if risk_level == 'high':
            if num_risk_factors >= 4:
                return "This is challenging, but not impossible! Many students have recovered from similar situations. Take it one task at a time, ask for help, and don't give up. Your instructors want to see you succeed!"
            else:
                return "You can turn this around! Focus on the specific actions above, reach out for support, and commit to daily progress. Success is within your reach!"
        
        elif risk_level == 'medium':
            return "You're in a good position to improve! Small, consistent changes in your study habits will lead to significant results. Stay focused and proactive!"
        
        else:
            return "Excellent work! Your dedication and consistent efforts are clearly paying off. Keep maintaining these strong habits and you'll continue to excel!"
    
    
    def _update_student_history(self, student_id, prediction_result):
        """
        Track student history for trend analysis
        """
        if student_id not in self.student_history:
            self.student_history[student_id] = []
        
        self.student_history[student_id].append({
            'timestamp': datetime.utcnow().isoformat(),
            'risk_prob': prediction_result.get('risk_probability', 0),
            'risk_level': prediction_result.get('risk_level', 'unknown')
        })
        
        # Keep only last 10 predictions
        if len(self.student_history[student_id]) > 10:
            self.student_history[student_id] = self.student_history[student_id][-10:]
    
    
    def _basic_recommendations(self, prediction_result):
        """
        Basic fallback if something goes wrong
        """
        risk_level = prediction_result.get('risk_level', 'medium')
        
        return {
            'explanation': f"You are currently at {risk_level} risk based on your learning patterns.",
            'action_steps': [
                "Review course materials regularly",
                "Complete assignments on time",
                "Seek help when needed"
            ],
            'motivation': "Stay consistent and reach out for support!",
            'generated_at': datetime.utcnow().isoformat(),
            'source': 'basic_fallback'
        }


llm_service = LLMRecommendationService()