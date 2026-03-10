import os
import json
import logging
import requests
from datetime import datetime, timedelta

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
                return self._fallback_recommendations()
            
            # Parse response
            result = self._parse_response(response)
            result['source'] = 'groq_llm'
            result['model'] = self.model
            result['generated_at'] = datetime.utcnow().isoformat()
            
            logger.info("✓ LLM recommendations generated successfully!")
            return result
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")    
            return self._fallback_recommendations()

    def generate_goal_suggestions(self, goal_context):
        """
        Generate structured learning-goal suggestions that match the frontend goal form.
        """
        try:
            prompt = self._build_goal_prompt(goal_context)
            response = self._call_groq_api(prompt)

            if not response:
                logger.warning("Goal suggestion API call failed. Using fallback goals.")
                return self._fallback_goal_suggestions(goal_context)

            parsed = self._parse_goal_suggestions(response, goal_context)
            if not parsed:
                logger.warning("Goal suggestion parsing failed. Using fallback goals.")
                return self._fallback_goal_suggestions(goal_context)

            return parsed
        except Exception as e:
            logger.error(f"Error generating goal suggestions: {str(e)}")
            return self._fallback_goal_suggestions(goal_context)

    def generate_goal_resources(self, resource_context):
        """
        Generate structured resource suggestions for a single goal.
        Each suggestion points to a provider search URL rather than a fabricated direct link.
        """
        try:
            prompt = self._build_goal_resource_prompt(resource_context)
            response = self._call_groq_api(prompt)

            if not response:
                logger.warning("Goal resource API call failed. Using fallback resources.")
                return self._fallback_goal_resources(resource_context)

            parsed = self._parse_goal_resources(response, resource_context)
            if not parsed:
                logger.warning("Goal resource parsing failed. Using fallback resources.")
                return self._fallback_goal_resources(resource_context)

            return parsed
        except Exception as e:
            logger.error(f"Error generating goal resources: {str(e)}")
            return self._fallback_goal_resources(resource_context)
    
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

    def _build_goal_prompt(self, goal_context):
        student = goal_context.get('student', {})
        courses = goal_context.get('courses', [])
        projects = goal_context.get('projects', [])
        tasks = goal_context.get('tasks', [])
        goals = goal_context.get('existing_goals', [])
        prediction = goal_context.get('latest_prediction', {})

        course_lines = [
            f"- {course.get('courseName', 'Unknown Course')} ({course.get('credits', 0)} credits)"
            for course in courses[:8]
        ] or ["- No active course data available"]

        project_lines = [
            f"- {item.get('name')} | {item.get('courseName')} | {item.get('status')} | due {item.get('deadlineDate') or 'n/a'}"
            for item in projects[:8]
        ] or ["- No recent project activity"]

        task_lines = [
            f"- {item.get('name')} | {item.get('courseName')} | {item.get('status')} | due {item.get('deadlineDate') or 'n/a'}"
            for item in tasks[:8]
        ] or ["- No recent task activity"]

        goal_lines = [
            f"- {item.get('title')} ({item.get('status')})"
            for item in goals[:8]
        ] or ["- No existing goals"]

        risk_factors = prediction.get('risk_factors', []) or []
        risk_lines = [f"- {factor}" for factor in risk_factors[:6]] or ["- No stored risk factors"]

        return f"""You are helping a university student create practical learning goals based on coursework history.

Return valid JSON only. No markdown. No explanation outside JSON.

Required JSON shape:
{{
  "goals": [
    {{
      "title": "string <= 200 chars",
      "description": "string <= 1000 chars",
      "category": "academic|skill|project|career|personal",
      "targetDate": "YYYY-MM-DD",
      "priority": "low|medium|high",
      "milestones": [
        {{"id": "m1", "title": "string", "completed": false}}
      ],
      "tags": ["short-tag-1", "short-tag-2"]
    }}
  ]
}}

Rules:
- Suggest exactly 3 goals.
- Goals must be realistic for the next 2 to 8 weeks.
- Avoid duplicating existing goals.
- Use the student's recent coursework and risk signals.
- Milestones should be concrete and directly actionable.
- Keep tags short and lowercase.
- Do not set status, progress, or courseId.

Student profile:
- Name: {student.get('name', 'Student')}
- Academic year: {student.get('academicYear', 'n/a')}
- Semester: {student.get('semester', 'n/a')}
- Specialization: {student.get('specialization', 'n/a')}

Latest learning-risk context:
- Risk level: {prediction.get('risk_level', 'unknown')}
- Risk probability: {prediction.get('risk_probability', 0)}
- Risk factors:
{chr(10).join(risk_lines)}

Current courses:
{chr(10).join(course_lines)}

Recent project work:
{chr(10).join(project_lines)}

Recent task work:
{chr(10).join(task_lines)}

Existing goals:
{chr(10).join(goal_lines)}
"""

    def _build_goal_resource_prompt(self, resource_context):
        student = resource_context.get('student', {})
        goal = resource_context.get('goal', {})
        courses = resource_context.get('courses', [])
        prediction = resource_context.get('latest_prediction', {})

        course_lines = [
            f"- {course.get('courseName', 'Unknown Course')}"
            for course in courses[:6]
        ] or ["- No active course data available"]

        tags = goal.get('tags', []) or []
        milestones = goal.get('milestones', []) or []
        risk_factors = prediction.get('risk_factors', []) or []

        return f"""You are helping a university student find useful learning resources for one goal.

Return valid JSON only. No markdown. No explanation outside JSON.

Required JSON shape:
{{
  "resources": [
    {{
      "title": "short useful label",
      "provider": "youtube|google|linkedin",
      "resourceType": "video|article|course|documentation|practice",
      "query": "search query only",
      "reason": "1-2 sentence reason",
      "tags": ["short", "lowercase"]
    }}
  ]
}}

Rules:
- Suggest exactly 3 resources.
- Use only providers: youtube, google, linkedin.
- Queries must be realistic and specific to the goal.
- All suggestions should be highly practical, not generic.
- Prefer official docs, explainers, walkthroughs, or job-relevant learning content.
- Do not fabricate direct website URLs.
- Keep titles concise.

Student profile:
- Name: {student.get('name', 'Student')}
- Specialization: {student.get('specialization', 'n/a')}
- Year: {student.get('academicYear', 'n/a')}
- Semester: {student.get('semester', 'n/a')}

Current courses:
{chr(10).join(course_lines)}

Goal:
- Title: {goal.get('title', '')}
- Description: {goal.get('description', '')}
- Category: {goal.get('category', 'academic')}
- Priority: {goal.get('priority', 'medium')}
- Tags: {', '.join(tags) if tags else 'none'}
- Milestones:
{chr(10).join([f"- {m.get('title', '')}" for m in milestones[:5]]) if milestones else '- none'}

Prediction context:
- Risk level: {prediction.get('risk_level', 'unknown')}
- Risk factors:
{chr(10).join([f"- {factor}" for factor in risk_factors[:5]]) if risk_factors else '- none'}
"""

    def _extract_json_object(self, text):
        if not text:
            return None

        cleaned = text.strip()
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start == -1 or end == -1 or end <= start:
            return None

        try:
            return json.loads(cleaned[start:end + 1])
        except Exception:
            return None

    def _safe_goal_date(self, value, fallback_days):
        try:
            parsed = datetime.strptime(str(value), "%Y-%m-%d").date()
            today = datetime.utcnow().date()
            if parsed <= today:
                parsed = today + timedelta(days=fallback_days)
            return parsed.isoformat()
        except Exception:
            return (datetime.utcnow().date() + timedelta(days=fallback_days)).isoformat()

    def _normalize_goal_category(self, value):
        allowed = {'academic', 'skill', 'project', 'career', 'personal'}
        value = str(value or 'academic').strip().lower()
        return value if value in allowed else 'academic'

    def _normalize_goal_priority(self, value):
        allowed = {'low', 'medium', 'high'}
        value = str(value or 'medium').strip().lower()
        return value if value in allowed else 'medium'

    def _normalize_resource_provider(self, value):
        allowed = {'youtube', 'google', 'linkedin'}
        value = str(value or 'google').strip().lower()
        return value if value in allowed else 'google'

    def _normalize_resource_type(self, value):
        allowed = {'video', 'article', 'course', 'documentation', 'practice'}
        value = str(value or 'article').strip().lower()
        return value if value in allowed else 'article'

    def _resource_url(self, provider, query):
        from urllib.parse import quote_plus

        encoded = quote_plus(query)
        if provider == 'youtube':
            return f"https://www.youtube.com/results?search_query={encoded}"
        if provider == 'linkedin':
            return f"https://www.linkedin.com/search/results/content/?keywords={encoded}"
        return f"https://www.google.com/search?q={encoded}"

    def _normalize_goal_suggestion(self, raw_goal, index):
        fallback_days = 14 + (index * 7)
        milestones = raw_goal.get('milestones', []) if isinstance(raw_goal, dict) else []
        normalized_milestones = []
        for idx, milestone in enumerate(milestones[:4]):
            title = str((milestone or {}).get('title', '')).strip()
            if not title:
                continue
            normalized_milestones.append({
                'id': f"m{idx + 1}",
                'title': title[:200],
                'completed': False,
            })

        tags = raw_goal.get('tags', []) if isinstance(raw_goal, dict) else []
        normalized_tags = []
        for tag in tags[:5]:
            cleaned = str(tag).strip().lower().replace(' ', '-')
            if cleaned:
                normalized_tags.append(cleaned[:50])

        return {
            'title': str(raw_goal.get('title', f'AI Goal Suggestion {index + 1}')).strip()[:200],
            'description': str(raw_goal.get('description', 'Build steady progress using your recent coursework.')).strip()[:1000],
            'category': self._normalize_goal_category(raw_goal.get('category')),
            'targetDate': self._safe_goal_date(raw_goal.get('targetDate'), fallback_days),
            'priority': self._normalize_goal_priority(raw_goal.get('priority')),
            'milestones': normalized_milestones,
            'tags': normalized_tags,
        }

    def _parse_goal_suggestions(self, response_text, goal_context):
        parsed = self._extract_json_object(response_text)
        if not parsed or not isinstance(parsed.get('goals'), list):
            return None

        normalized = []
        for index, goal in enumerate(parsed.get('goals', [])[:3]):
            if not isinstance(goal, dict):
                continue
            normalized.append(self._normalize_goal_suggestion(goal, index))

        if not normalized:
            return None

        while len(normalized) < 3:
            fallback = self._fallback_goal_suggestions(goal_context)[len(normalized)]
            normalized.append(fallback)

        return normalized[:3]

    def _normalize_goal_resource(self, raw_resource, index):
        provider = self._normalize_resource_provider(raw_resource.get('provider'))
        query = str(raw_resource.get('query', '')).strip()
        if not query:
            query = str(raw_resource.get('title', f'learning resource {index + 1}')).strip()

        tags = raw_resource.get('tags', []) if isinstance(raw_resource, dict) else []
        normalized_tags = []
        for tag in tags[:5]:
            cleaned = str(tag).strip().lower().replace(' ', '-')
            if cleaned:
                normalized_tags.append(cleaned[:50])

        return {
            'title': str(raw_resource.get('title', f'Resource suggestion {index + 1}')).strip()[:140],
            'provider': provider,
            'resourceType': self._normalize_resource_type(raw_resource.get('resourceType')),
            'query': query[:200],
            'url': self._resource_url(provider, query),
            'reason': str(raw_resource.get('reason', 'Useful for making progress on this goal.')).strip()[:400],
            'tags': normalized_tags,
        }

    def _parse_goal_resources(self, response_text, resource_context):
        parsed = self._extract_json_object(response_text)
        if not parsed or not isinstance(parsed.get('resources'), list):
            return None

        normalized = []
        for index, resource in enumerate(parsed.get('resources', [])[:3]):
            if not isinstance(resource, dict):
                continue
            normalized.append(self._normalize_goal_resource(resource, index))

        if not normalized:
            return None

        while len(normalized) < 3:
            fallback = self._fallback_goal_resources(resource_context)
            normalized.append(fallback[len(normalized) % len(fallback)])

        return normalized[:3]

    def _fallback_goal_suggestions(self, goal_context):
        courses = goal_context.get('courses', [])
        projects = goal_context.get('projects', [])
        tasks = goal_context.get('tasks', [])
        prediction = goal_context.get('latest_prediction', {})
        existing_titles = {
            str(goal.get('title', '')).strip().lower()
            for goal in goal_context.get('existing_goals', [])
        }

        primary_course = courses[0].get('courseName') if courses else 'your current modules'
        first_project = projects[0].get('name') if projects else 'current project work'
        first_task = tasks[0].get('name') if tasks else 'weekly task work'
        risk_level = str(prediction.get('risk_level', 'medium')).lower()

        templates = [
            {
                'title': f'Improve consistency in {primary_course}',
                'description': f'Build a steady weekly study routine for {primary_course} using your recent coursework activity as a guide.',
                'category': 'academic',
                'targetDate': self._safe_goal_date(None, 14),
                'priority': 'high' if risk_level in {'high', 'medium'} else 'medium',
                'milestones': [
                    {'id': 'm1', 'title': 'Review the last two weeks of course material', 'completed': False},
                    {'id': 'm2', 'title': 'Schedule three focused study sessions this week', 'completed': False},
                    {'id': 'm3', 'title': 'Finish one pending course item before the target date', 'completed': False},
                ],
                'tags': ['academic', 'consistency', 'study-plan'],
            },
            {
                'title': f'Break down {first_project}',
                'description': f'Turn {first_project} into smaller milestones so progress is easier to track and less likely to slip.',
                'category': 'project',
                'targetDate': self._safe_goal_date(None, 21),
                'priority': 'medium',
                'milestones': [
                    {'id': 'm1', 'title': 'List the next 3 deliverables for the project', 'completed': False},
                    {'id': 'm2', 'title': 'Complete the highest-effort deliverable first', 'completed': False},
                    {'id': 'm3', 'title': 'Review progress against the project deadline', 'completed': False},
                ],
                'tags': ['project', 'planning', 'milestones'],
            },
            {
                'title': f'Strengthen delivery on {first_task}',
                'description': f'Improve on-time completion and task quality by planning earlier work on {first_task} and similar tasks.',
                'category': 'skill',
                'targetDate': self._safe_goal_date(None, 28),
                'priority': 'medium',
                'milestones': [
                    {'id': 'm1', 'title': 'Start the next task at least two days before its deadline', 'completed': False},
                    {'id': 'm2', 'title': 'Track blockers as they appear and resolve one early', 'completed': False},
                    {'id': 'm3', 'title': 'Submit one task with a self-review checklist', 'completed': False},
                ],
                'tags': ['time-management', 'task-quality', 'execution'],
            },
        ]

        suggestions = []
        for template in templates:
            if template['title'].strip().lower() in existing_titles:
                continue
            suggestions.append(template)

        generic_index = 1
        while len(suggestions) < 3:
            suggestions.append({
                'title': f'Build a focused weekly learning routine {generic_index}',
                'description': 'Create a realistic weekly goal that improves consistency across your current coursework.',
                'category': 'academic',
                'targetDate': self._safe_goal_date(None, 14 + (generic_index * 7)),
                'priority': 'medium',
                'milestones': [
                    {'id': 'm1', 'title': 'Choose one course area to improve this week', 'completed': False},
                    {'id': 'm2', 'title': 'Block out two focused study sessions', 'completed': False},
                    {'id': 'm3', 'title': 'Review progress before the target date', 'completed': False},
                ],
                'tags': ['learning', 'routine', 'focus'],
            })
            generic_index += 1

        return suggestions[:3]

    def _fallback_goal_resources(self, resource_context):
        goal = resource_context.get('goal', {})
        title = str(goal.get('title', 'learning goal')).strip()
        category = str(goal.get('category', 'academic')).strip().lower()

        templates = [
            {
                'title': f'YouTube walkthroughs for {title}',
                'provider': 'youtube',
                'resourceType': 'video',
                'query': f"{title} tutorial walkthrough",
                'url': self._resource_url('youtube', f"{title} tutorial walkthrough"),
                'reason': 'Short video walkthroughs are useful when you need a quick practical explanation and momentum.',
                'tags': ['video', 'walkthrough'],
            },
            {
                'title': f'Google results for {title}',
                'provider': 'google',
                'resourceType': 'article',
                'query': f"{title} best guide {category}",
                'url': self._resource_url('google', f"{title} best guide {category}"),
                'reason': 'Search results help surface articles, official docs, and examples relevant to this goal.',
                'tags': ['guide', 'search'],
            },
            {
                'title': f'LinkedIn learning topics for {title}',
                'provider': 'linkedin',
                'resourceType': 'course',
                'query': f"{title} learning course",
                'url': self._resource_url('linkedin', f"{title} learning course"),
                'reason': 'Professional learning content can connect this goal to practical workplace skills.',
                'tags': ['career', 'course'],
            },
        ]

        return templates[:3]
    
    
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
        
        if not response_text:
            return self._fallback_recommendations()
        
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

    def _fallback_recommendations(self):
        return {
            'explanation': "We couldn't generate a personalized summary right now, but your recent activity has been analyzed.",
            'action_steps': [
                "Keep a consistent weekly study schedule",
                "Focus on completing pending tasks on time",
                "Reach out to your instructor when stuck"
            ],
            'motivation': "Small, steady steps make a big difference. You’ve got this!",
            'source': 'fallback',
            'model': 'n/a',
            'generated_at': datetime.utcnow().isoformat()
        }
    
    
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
