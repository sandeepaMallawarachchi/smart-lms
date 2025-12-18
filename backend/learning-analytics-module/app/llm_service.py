"""
LLM-based Recommendation Service using Transformers
"""

import os
import logging
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMRecommendationService:
    """
    Generates personalized recommendations using Llama 3.2 3B
    """
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.model_loaded = False
        self.student_history = {}
    
    
    def load_model(self):
        """
        Load Llama 3.2 3B using Transformers
        """
        try:
            model_name = "meta-llama/Llama-3.2-3B-Instruct"
            
            logger.info(f"Loading tokenizer from Hugging Face: {model_name}")
            
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            
            logger.info("Loading model (this may take 2-3 minutes on first load)...")
            
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float32,
                device_map="cpu",
                low_cpu_mem_usage=True
            )
            
            self.model_loaded = True
            logger.info("✓ LLM loaded successfully!")
            return True
            
        except Exception as e:
            logger.error(f"✗ Error loading LLM: {str(e)}")
            logger.warning("You may need Hugging Face token for Llama models")
            logger.warning("Get token from: https://huggingface.co/settings/tokens")
            logger.warning("Then run: huggingface-cli login")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    
    def generate_recommendations(self, student_data, prediction_result, student_id=None):
        """
        Generate personalized recommendations
        """
        try:
            if not self.model_loaded:
                logger.info("Attempting to load LLM...")
                if not self.load_model():
                    logger.warning("LLM load failed. Using fallback.")
                    return self._fallback_recommendations(prediction_result, student_data)
            
            logger.info("Generating LLM recommendations...")
            
            prompt = self._build_prompt(student_data, prediction_result, student_id)
            
            inputs = self.tokenizer(
                prompt, 
                return_tensors="pt", 
                max_length=1024, 
                truncation=True
            )
            
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=400,
                    temperature=0.7,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )
            
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            recommendation_text = response[len(prompt):].strip()
            
            logger.info(f"LLM response generated ({len(recommendation_text)} chars)")
            
            if student_id:
                self._update_student_history(student_id, prediction_result, recommendation_text)
            
            result = {
                'explanation': self._extract_explanation(recommendation_text),
                'action_steps': self._extract_action_steps(recommendation_text),
                'motivation': self._extract_motivation(recommendation_text),
                'generated_at': datetime.utcnow().isoformat(),
                'source': 'llm'
            }
            
            logger.info("✓ LLM recommendations generated!")
            return result
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return self._fallback_recommendations(prediction_result, student_data)
    
    
    def _build_prompt(self, student_data, prediction_result, student_id):
        """Build prompt for LLM"""
        risk_level = prediction_result.get('risk_level', 'unknown')
        risk_prob = prediction_result.get('risk_probability', 0)
        risk_factors = prediction_result.get('risk_factors', [])
        
        engagement_desc = self._describe_engagement(student_data)
        performance_desc = self._describe_performance(student_data)
        timing_desc = self._describe_timing(student_data)
        risk_factors_text = self._format_risk_factors(risk_factors)
        
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a supportive academic advisor helping university students succeed.<|eot_id|><|start_header_id|>user<|end_header_id|>

A student needs guidance. Their profile:

Student Profile:
- Engagement: {engagement_desc}
- Performance: {performance_desc}
- Submission Timing: {timing_desc}
- Risk Level: {risk_level.upper()} ({risk_prob:.0%} probability)

Challenges:
{risk_factors_text}

Provide friendly advice in 3 parts:

1. EXPLANATION (2-3 sentences explaining why they are at this risk level)
2. ACTION STEPS (3-5 specific actions as bullet points)
3. MOTIVATION (1-2 encouraging sentences)

Be warm, specific, and actionable.<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
        return prompt
    
    
    def _describe_engagement(self, data):
        total_clicks = data.get('total_clicks', 0)
        avg_daily = data.get('avg_clicks_per_day', 0)
        
        if total_clicks > 4000 and avg_daily > 40:
            return f"Excellent - {total_clicks:,} interactions"
        elif total_clicks > 2000:
            return f"Moderate - {total_clicks:,} interactions"
        else:
            return f"Low - {total_clicks:,} interactions"
    
    
    def _describe_performance(self, data):
        avg_score = data.get('avg_score', 0)
        completion = data.get('completion_rate', 0)
        
        if avg_score > 70:
            return f"Strong - {avg_score:.1f}% average"
        elif avg_score > 50:
            return f"Developing - {avg_score:.1f}% average"
        else:
            return f"Struggling - {avg_score:.1f}% average"
    
    
    def _describe_timing(self, data):
        late_count = data.get('late_submission_count', 0)
        
        if late_count == 0:
            return "Excellent timing"
        elif late_count <= 2:
            return f"Good - {late_count} late submission(s)"
        else:
            return f"Needs improvement - {late_count} late submissions"
    
    
    def _format_risk_factors(self, risk_factors):
        if not risk_factors:
            return "No major challenges"
        
        lines = []
        for factor in risk_factors[:5]:
            lines.append(f"- {factor['description']}")
        
        return "\n".join(lines)
    
    
    def _extract_explanation(self, text):
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        for i, line in enumerate(lines):
            if 'EXPLANATION' in line.upper():
                explanation_lines = []
                for j in range(i+1, min(i+5, len(lines))):
                    if 'ACTION' in lines[j].upper() or 'STEP' in lines[j].upper():
                        break
                    if lines[j]:
                        explanation_lines.append(lines[j])
                if explanation_lines:
                    return ' '.join(explanation_lines)
        
        return lines[0] if lines else "Based on your learning patterns, here's what we recommend."
    
    
    def _extract_action_steps(self, text):
        steps = []
        lines = text.split('\n')
        in_action_section = False
        
        for line in lines:
            line = line.strip()
            if 'ACTION' in line.upper() or 'STEP' in line.upper():
                in_action_section = True
                continue
            if 'MOTIVATION' in line.upper():
                break
            
            if in_action_section and line:
                if line.startswith('-') or line.startswith('•') or line.startswith('*'):
                    clean = line.lstrip('-•* ').strip()
                    if len(clean) > 15:
                        steps.append(clean)
                elif line[0].isdigit() and '.' in line[:3]:
                    clean = line.split('.', 1)[1].strip()
                    if len(clean) > 15:
                        steps.append(clean)
        
        if not steps:
            steps = [
                "Increase daily engagement with learning materials",
                "Complete assessments on time",
                "Seek help from instructors when needed"
            ]
        
        return steps[:5]
    
    
    def _extract_motivation(self, text):
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        for i, line in enumerate(lines):
            if 'MOTIVATION' in line.upper():
                motivation_lines = []
                for j in range(i+1, min(i+4, len(lines))):
                    if lines[j]:
                        motivation_lines.append(lines[j])
                if motivation_lines:
                    return ' '.join(motivation_lines)
        
        if len(lines) > 1:
            return lines[-1]
        
        return "You can succeed with consistent effort!"
    
    
    def _update_student_history(self, student_id, prediction_result, recommendation):
        if student_id not in self.student_history:
            self.student_history[student_id] = []
        
        self.student_history[student_id].append({
            'timestamp': datetime.utcnow().isoformat(),
            'risk_prob': prediction_result.get('risk_probability', 0),
            'risk_level': prediction_result.get('risk_level', 'unknown')
        })
        
        if len(self.student_history[student_id]) > 10:
            self.student_history[student_id] = self.student_history[student_id][-10:]
    
    
    def _fallback_recommendations(self, prediction_result, student_data):
        """Enhanced rule-based fallback"""
        risk_level = prediction_result.get('risk_level', 'medium')
        risk_factors = prediction_result.get('risk_factors', [])
        
        if risk_level == 'high':
            explanation = "You're at high risk due to multiple factors. However, improvement is possible with focused effort."
        elif risk_level == 'medium':
            explanation = "You're at moderate risk. Some areas need attention for academic success."
        else:
            explanation = "You're doing well! Keep up the good work."
        
        action_steps = []
        factor_types = [f['factor'] for f in risk_factors]
        
        if any('engagement' in f or 'click' in f for f in factor_types):
            action_steps.append("Log in daily and spend 30 minutes on course materials")
        
        if any('performance' in f or 'score' in f for f in factor_types):
            action_steps.append("Review content before assessments and seek help for difficult topics")
        
        if any('late' in f or 'timing' in f for f in factor_types):
            action_steps.append("Start assignments 5 days early and create a study schedule")
        
        if len(action_steps) < 3:
            action_steps.extend([
                "Complete all assessments before deadlines",
                "Participate actively in discussions",
                "Contact instructors when you need help"
            ])
        
        if risk_level == 'high':
            motivation = "Don't give up! Take it one step at a time. You've got this!"
        else:
            motivation = "Keep up the great work! Small improvements lead to big results."
        
        return {
            'explanation': explanation,
            'action_steps': action_steps[:5],
            'motivation': motivation,
            'generated_at': datetime.utcnow().isoformat(),
            'source': 'rule_based'
        }


llm_service = LLMRecommendationService()