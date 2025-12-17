"""
LLM-based Recommendation Service
Uses Llama 3.2 3B for personalized student recommendations
"""

import os
import logging
from llama_cpp import Llama
from flask import current_app
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMRecommendationService:
    """
    Generates personalized recommendations using Llama 3.2 3B
    """
    
    def __init__(self):
        self.llm = None
        self.model_loaded = False
        self.student_history = {}
    
    
    def load_model(self):
        """
        Load Llama 3.2 3B model
        """
        try:
            model_path = "models/llm/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
            
            if not os.path.exists(model_path):
                raise Exception(f"Model not found at {model_path}. Run download_model.py first!")
            
            logger.info(f"Loading LLM from {model_path}")
            
            self.llm = Llama(
                model_path=model_path,
                n_ctx=2048,
                n_threads=4,
                n_gpu_layers=0,
                verbose=False
            )
            
            self.model_loaded = True
            logger.info("LLM loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading LLM: {str(e)}")
            raise Exception(f"Failed to load LLM: {str(e)}")
    
    
    def generate_recommendations(self, student_data, prediction_result, student_id=None):
        """
        Generate personalized recommendations using LLM
        
        Args:
            student_data: Dictionary with student features
            prediction_result: Dictionary with prediction from ML model
            student_id: Optional student ID for personalization
            
        Returns:
            Dictionary with recommendations and explanations
        """
        try:
            if not self.model_loaded:
                self.load_model()
            
            prompt = self._build_prompt(student_data, prediction_result, student_id)
            
            response = self.llm(
                prompt,
                max_tokens=500,
                temperature=0.7,
                top_p=0.9,
                stop=["###", "User:", "Student:"],
                echo=False
            )
            
            recommendation_text = response['choices'][0]['text'].strip()
            
            if student_id:
                self._update_student_history(student_id, prediction_result, recommendation_text)
            
            return {
                'explanation': self._extract_explanation(recommendation_text),
                'action_steps': self._extract_action_steps(recommendation_text),
                'motivation': self._extract_motivation(recommendation_text),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return self._fallback_recommendations(prediction_result)
    
    
    def _build_prompt(self, student_data, prediction_result, student_id):
        """
        Build prompt for LLM based on student data and context
        """
        risk_level = prediction_result.get('risk_level', 'unknown')
        risk_prob = prediction_result.get('risk_probability', 0)
        risk_factors = prediction_result.get('risk_factors', [])
        
        history_context = ""
        if student_id and student_id in self.student_history:
            prev_predictions = self.student_history[student_id]
            if len(prev_predictions) > 1:
                history_context = f"\n\nThis student has been monitored {len(prev_predictions)} times. Their engagement has been {'improving' if prev_predictions[-1]['risk_prob'] < prev_predictions[-2]['risk_prob'] else 'declining'}."
        
        engagement_status = self._describe_engagement(student_data)
        performance_status = self._describe_performance(student_data)
        timing_status = self._describe_timing(student_data)
        
        prompt = f"""You are a supportive academic advisor helping university students succeed. A student needs guidance based on their learning analytics.

Student Learning Profile:
- Engagement: {engagement_status}
- Performance: {performance_status}
- Submission Timing: {timing_status}
- Risk Level: {risk_level.upper()} (probability: {risk_prob:.1%})

Identified Challenges:
{self._format_risk_factors(risk_factors)}
{history_context}

Your task: Provide friendly, actionable advice in 3 parts:

1. EXPLANATION: Why is the student at this risk level? (2-3 sentences, encouraging tone)

2. ACTION STEPS: What specific things should they do? (3-5 bullet points, concrete actions)

3. MOTIVATION: Positive encouragement (1-2 sentences)

Be warm, supportive, and specific. Avoid generic advice. Focus on what the student CAN control.

Response:"""

        return prompt
    
    
    def _describe_engagement(self, data):
        """Describe engagement level in natural language"""
        total_clicks = data.get('total_clicks', 0)
        avg_daily = data.get('avg_clicks_per_day', 0)
        days_active = data.get('days_active', 0)
        
        if total_clicks > 4000 and avg_daily > 40:
            return f"Excellent - {total_clicks:,} total interactions, active {days_active} days"
        elif total_clicks > 2000:
            return f"Moderate - {total_clicks:,} interactions, but could increase consistency"
        else:
            return f"Low - Only {total_clicks:,} interactions, needs significant improvement"
    
    
    def _describe_performance(self, data):
        """Describe academic performance in natural language"""
        avg_score = data.get('avg_score', 0)
        completion_rate = data.get('completion_rate', 0)
        
        if avg_score > 70 and completion_rate > 0.8:
            return f"Strong - {avg_score:.1f}% average, {completion_rate:.0%} completion rate"
        elif avg_score > 50:
            return f"Developing - {avg_score:.1f}% average, room for improvement"
        else:
            return f"Struggling - {avg_score:.1f}% average, needs urgent support"
    
    
    def _describe_timing(self, data):
        """Describe submission timing patterns"""
        late_count = data.get('late_submission_count', 0)
        avg_early = data.get('avg_days_early', 0)
        
        if late_count == 0 and avg_early > 0:
            return f"Excellent - Submits {avg_early:.1f} days early on average"
        elif late_count <= 2:
            return f"Good - {late_count} late submissions"
        else:
            return f"Concerning - {late_count} late submissions, time management needs work"
    
    
    def _format_risk_factors(self, risk_factors):
        """Format risk factors for prompt"""
        if not risk_factors:
            return "No major challenges identified"
        
        formatted = []
        for factor in risk_factors[:5]:
            formatted.append(f"- {factor['description']} (severity: {factor['severity']})")
        
        return "\n".join(formatted)
    
    
    def _extract_explanation(self, text):
        """Extract explanation section from LLM response"""
        lines = text.split('\n')
        explanation = []
        in_section = False
        
        for line in lines:
            if 'EXPLANATION' in line.upper() or 'WHY' in line.upper():
                in_section = True
                continue
            if 'ACTION' in line.upper() or 'STEP' in line.upper():
                break
            if in_section and line.strip():
                explanation.append(line.strip())
        
        return ' '.join(explanation) if explanation else text.split('\n')[0]
    
    
    def _extract_action_steps(self, text):
        """Extract action steps from LLM response"""
        lines = text.split('\n')
        steps = []
        in_section = False
        
        for line in lines:
            if 'ACTION' in line.upper() or 'STEP' in line.upper():
                in_section = True
                continue
            if 'MOTIVATION' in line.upper() or 'ENCOURAGE' in line.upper():
                break
            if in_section and line.strip() and (line.strip().startswith('-') or line.strip().startswith('•') or line.strip()[0].isdigit()):
                clean_line = line.strip().lstrip('-•0123456789. ')
                if clean_line:
                    steps.append(clean_line)
        
        return steps if steps else ["Follow course schedule regularly", "Engage with learning materials daily", "Seek help when needed"]
    
    
    def _extract_motivation(self, text):
        """Extract motivational message from LLM response"""
        lines = text.split('\n')
        motivation = []
        in_section = False
        
        for line in lines:
            if 'MOTIVATION' in line.upper() or 'ENCOURAGE' in line.upper():
                in_section = True
                continue
            if in_section and line.strip():
                motivation.append(line.strip())
        
        return ' '.join(motivation) if motivation else "You can succeed with consistent effort and the right support!"
    
    
    def _update_student_history(self, student_id, prediction_result, recommendation):
        """Update student history for personalization"""
        if student_id not in self.student_history:
            self.student_history[student_id] = []
        
        self.student_history[student_id].append({
            'timestamp': datetime.utcnow().isoformat(),
            'risk_prob': prediction_result.get('risk_probability', 0),
            'risk_level': prediction_result.get('risk_level', 'unknown'),
            'recommendation_preview': recommendation[:100]
        })
        
        if len(self.student_history[student_id]) > 10:
            self.student_history[student_id] = self.student_history[student_id][-10:]
    
    
    def _fallback_recommendations(self, prediction_result):
        """Fallback recommendations if LLM fails"""
        risk_level = prediction_result.get('risk_level', 'medium')
        
        fallback = {
            'explanation': f"Based on your learning patterns, you are at {risk_level} risk. This assessment considers your engagement, performance, and submission patterns.",
            'action_steps': [
                "Increase daily interaction with course materials",
                "Complete pending assessments on time",
                "Seek help from instructors or tutors if struggling",
                "Maintain a consistent study schedule"
            ],
            'motivation': "Remember, improvement is always possible with consistent effort. Your success matters!",
            'generated_at': datetime.utcnow().isoformat(),
            'fallback': True
        }
        
        return fallback


llm_service = LLMRecommendationService()