# Smart LMS Backend

This README currently documents only the **Learning Analytics backend module**.
Other backend modules can append their sections here later.

Repository: `https://github.com/sandeepaMallawarachchi/smart-lms`

## Learning Analytics Backend

Path: `backend/learning-analytics-module`

### Tech stack
- Python 3.9+
- Flask
- scikit-learn + LightGBM model inference
- pandas / numpy
- Groq API (optional, for LLM recommendations)

### Main files
- App bootstrap: `backend/learning-analytics-module/run.py`
- Flask app factory: `backend/learning-analytics-module/app/__init__.py`
- API routes: `backend/learning-analytics-module/app/routes.py`
- Model loading + prediction: `backend/learning-analytics-module/app/models.py`
- LLM recommendations: `backend/learning-analytics-module/app/llm_service.py`
- Config: `backend/learning-analytics-module/app/config.py`
- Python deps: `backend/learning-analytics-module/requirements.txt`

### API endpoints
Base URL: `http://127.0.0.1:5000`

- `GET /` : service metadata
- `GET /api/health` : health + model loaded status
- `GET /api/model/info` : loaded model details
- `GET /api/features` : expected feature names
- `GET /api/sample` : sample payloads
- `POST /api/predict` : predict risk + recommendations

### `POST /api/predict` (minimum expected payload shape)
```json
{
  "student_id": "it22552242",
  "total_clicks": 9,
  "avg_clicks_per_day": 0.23,
  "clicks_std": 0.65,
  "max_clicks_single_day": 3,
  "days_active": 5,
  "study_span_days": 28,
  "engagement_regularity": 2.85,
  "pre_course_clicks": 0,
  "avg_score": 0,
  "score_std": 0,
  "min_score": 0,
  "max_score": 0,
  "completion_rate": 0.42,
  "first_score": 0,
  "score_improvement": 0,
  "avg_days_early": 0,
  "timing_consistency": 0,
  "worst_delay": 0,
  "late_submission_count": 1,
  "num_of_prev_attempts": 0,
  "studied_credits": 7,
  "early_registration": 0,
  "withdrew": 0,
  "gender": "M",
  "age_band": "0-35",
  "highest_education": "A Level or Equivalent",
  "disability": "N"
}
```

## Run on another device

### 1) Clone repository
```bash
git clone https://github.com/sandeepaMallawarachchi/smart-lms.git
cd smart-lms
```

### 2) Set up Learning Analytics backend
```bash
cd backend/learning-analytics-module
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3) Configure environment (`backend/learning-analytics-module/.env`)
```env
API_HOST=127.0.0.1
API_PORT=5000
FLASK_DEBUG=True

MODEL_PATH=models/best_model_lightgbm.pkl
SCALER_PATH=models/scaler.pkl
ENCODERS_PATH=models/label_encoders.pkl

# Optional (for LLM recommendations)
GROQ_API_KEY=
```

### 4) Start service
```bash
python run.py
```

### 5) Validate
```bash
curl http://127.0.0.1:5000/api/health
```

## Notes
- This module currently accepts partial inputs and fills missing fields with defaults.
- If `GROQ_API_KEY` is missing or unavailable, fallback recommendation content is returned.

## GitHub Actions Pipelines

Backend CI workflows now exist per deployed service under `.github/workflows/`.

- `backend-submission-management.yml`
- `backend-version-control.yml`
- `backend-feedback.yml`
- `backend-integrity-monitoring.yml`
- `backend-learning-analytics.yml`
- `backend-heatmap.yml`
- `backend-chatbot.yml`

They all call the shared reusable workflow `backend-service-ci.yml`, which:

- validates Java services with Maven package builds
- validates Python services by installing dependencies and compiling sources
- builds each service Docker image in CI

The coding evaluation module is intentionally not included yet.

### Optional EC2 auto-deploy

Each service workflow is also prepared to auto-deploy on pushes to `main`.

Add these GitHub repository secrets before enabling that flow:

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`

Deployment behavior:

- CI runs first
- if CI passes on `main`, GitHub Actions SSHs into the EC2 host
- runs `git pull --ff-only origin main`
- rebuilds only the matching Compose service with `docker compose up -d --build <service>`

This expects the EC2 server to have the repository checked out at `~/smart-lms`.
