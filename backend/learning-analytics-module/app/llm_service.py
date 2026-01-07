import os
import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMRecommendationService:
    """
    Generates personalized recommendations using Groq cloud API
    """
    
    def __init__(self):
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.api_key = os.getenv('GROQ_API_KEY', '')
        self.model = "llama-3.3-70b-versatile"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.student_history = {}
        
        if not self.api_key:
            logger.warning("GROQ_API_KEY not set in .env file")
    
    
    def generate_recommendations(self, student_data, prediction_result, student_id=None):
        """
        Generate personalized recommendations using Groq API
        """
        try:
            if not self.api_key:
                logger.warning("No API key.")
            
            logger.info("Generating LLM recommendations via Groq API...")
            
            # Track history
            if student_id:
                self._update_student_history(student_id, prediction_result)
            
            # Build prompt
            prompt = self._build_prompt(student_data, prediction_result, student_id)
            
            # Call Groq API
            response = self._call_groq_api(prompt)
            
            if not response:
                logger.warning("API call failed.")
            
            # Parse response
            result = self._parse_response(response)
            result['source'] = 'groq_llm'
            result['model'] = self.model
            result['generated_at'] = datetime.utcnow().isoformat()
            
            logger.info("✓ LLM recommendations generated successfully!")
            return result
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")    
    
    def _call_groq_api(self, prompt):
        """
        Call Groq API to generate response
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a supportive academic advisor helping university students succeed. Provide warm, actionable advice."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 600,
                "temperature": 0.7,
                "top_p": 0.9
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content']
                logger.info(f"API response received ({len(content)} chars)")
                return content
            else:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"API call failed: {str(e)}")
            return None
    
    
    def _build_prompt(self, student_data, prediction_result, student_id):
        """
        Build prompt for LLM
        """
        risk_level = prediction_result.get('risk_level', 'unknown')
        risk_prob = prediction_result.get('risk_probability', 0)
        risk_factors = prediction_result.get('risk_factors', [])
        
        # Extract metrics
        total_clicks = student_data.get('total_clicks', 0)
        avg_score = student_data.get('avg_score', 0)
        completion_rate = student_data.get('completion_rate', 0)
        late_count = student_data.get('late_submission_count', 0)
        
        # Check improvement trend
        trend_info = ""
        if student_id and student_id in self.student_history:
            history = self.student_history[student_id]
            if len(history) > 1:
                is_improving = history[-1]['risk_prob'] < history[-2]['risk_prob']
                trend_info = f"\n- Trend: {'Improving' if is_improving else 'Declining'} (monitored {len(history)} times)"
        
        # Format risk factors
        challenges = []
        for factor in risk_factors[:5]:
            challenges.append(f"  - {factor['description']} (severity: {factor['severity']})")
        challenges_text = "\n".join(challenges) if challenges else "  - No specific challenges identified"
        
        prompt = f"""A university student needs academic guidance based on their learning analytics.

**Student Profile:**
- Platform Engagement: {total_clicks:,} total interactions
- Academic Performance: {avg_score:.1f}% average score
- Completion Rate: {completion_rate:.0%}
- Late Submissions: {late_count}
- Risk Level: {risk_level.upper()} ({risk_prob:.0%} probability){trend_info}

**Identified Challenges:**
{challenges_text}

**Your Task:**
Provide friendly, actionable advice in exactly 3 sections:

1. **EXPLANATION** (2-3 sentences):
   - Explain WHY the student is at this risk level
   - Reference specific metrics (engagement, performance, timing)
   - Be warm and encouraging

2. **ACTION STEPS** (3-5 bullet points):
   - Specific, concrete actions they should take
   - Prioritize based on their biggest challenges
   - Make them achievable and realistic

3. **MOTIVATION** (1-2 sentences):
   - Encouraging message appropriate to their situation
   - Focus on what they CAN control

**Format your response exactly like this:**

EXPLANATION:
[Your 2-3 sentence explanation here]

ACTION STEPS:
- [First specific action]
- [Second specific action]
- [Third specific action]

MOTIVATION:
[Your encouraging message here]

Be supportive, specific, and actionable. Focus on what the student can control."""

        return prompt
    
    
    def _parse_response(self, response_text):
        """
        Parse LLM response into structured format
        """
        import re
        
        result = {
            'explanation': '',
            'action_steps': [],
            'motivation': ''
        }
        
        # Extract EXPLANATION
        explanation_match = re.search(r'EXPLANATION:\s*(.+?)(?=ACTION STEPS:|$)', response_text, re.DOTALL | re.IGNORECASE)
        if explanation_match:
            result['explanation'] = explanation_match.group(1).strip()
        
        # Extract ACTION STEPS
        actions_match = re.search(r'ACTION STEPS:\s*(.+?)(?=MOTIVATION:|$)', response_text, re.DOTALL | re.IGNORECASE)
        if actions_match:
            actions_text = actions_match.group(1)
            # Find all bullet points
            bullets = re.findall(r'[-•*]\s*(.+)', actions_text)
            result['action_steps'] = [b.strip() for b in bullets if len(b.strip()) > 10]
        
        # Extract MOTIVATION
        motivation_match = re.search(r'MOTIVATION:\s*(.+?)$', response_text, re.DOTALL | re.IGNORECASE)
        if motivation_match:
            result['motivation'] = motivation_match.group(1).strip()
        
        # Fallback: use raw sections if parsing fails
        if not result['explanation']:
            lines = [l.strip() for l in response_text.split('\n') if l.strip()]
            result['explanation'] = lines[0] if lines else "Based on your learning patterns, here's what we recommend."
        
        if not result['action_steps']:
            result['action_steps'] = [
                "Increase daily engagement with course materials",
                "Complete all assessments on time",
                "Seek help from instructors when needed"
            ]
        
        if not result['motivation']:
            result['motivation'] = "You can succeed with consistent effort and support!"
        
        return result
    
    
    def _update_student_history(self, student_id, prediction_result):
        """Track student history for trend analysis"""
        if student_id not in self.student_history:
            self.student_history[student_id] = []
        
        self.student_history[student_id].append({
            'timestamp': datetime.utcnow().isoformat(),
            'risk_prob': prediction_result.get('risk_probability', 0),
            'risk_level': prediction_result.get('risk_level', 'unknown')
        })
        
        if len(self.student_history[student_id]) > 10:
            self.student_history[student_id] = self.student_history[student_id][-10:]


llm_service = LLMRecommendationService()