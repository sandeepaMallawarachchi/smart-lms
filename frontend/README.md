# Smart LMS Frontend

This README currently documents only the **Learning Analytics frontend module**.
Other frontend modules can append their sections here later.

Repository: `https://github.com/sandeepaMallawarachchi/smart-lms`

## Learning Analytics Frontend

Path: `frontend`

### Tech stack
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- MongoDB via Next API routes (for predictions/goals)

## Main pages

Base route: `/learning-analytics`

- `/learning-analytics/student` : Analytics dashboard overview
- `/learning-analytics/student/full-report` : End-to-end prediction + full report
- `/learning-analytics/student/learning-progress` : Course/task/project progress view
- `/learning-analytics/student/weekly-summary` : Weekly summary charts
- `/learning-analytics/student/monthly-report` : Monthly summary charts
- `/learning-analytics/student/learning-goals` : Goal management (`todo`, `inprogress`, `done`)

## Learning Analytics API routes in frontend

- `GET /api/learning-analytics/features`
  - Aggregates ML input features from course/project/task/heatmap data
- `POST /api/predictions`
- `GET /api/predictions`
- `GET /api/predictions/latest`
- `GET /api/predictions/[id]`
- `DELETE /api/predictions/[id]`
- `POST /api/student/learning-goals`
- `GET /api/student/learning-goals`
- `PATCH /api/student/learning-goals/[goalId]`
- `DELETE /api/student/learning-goals/[goalId]`
- `POST /api/chat/analytics` (proxy to chatbot backend)

## Important integration points

- Full report page calls ML API directly at:
  - `http://127.0.0.1:5000/api/predict`
- Feature aggregation route calls heatmap service:
  - `HEATMAP_SERVICE_URL` (default `http://localhost:5002/heatmap`)
- Chat UI calls Next proxy route, which forwards to:
  - `CHATBOT_URL` (default `http://localhost:5001/chat`)

## Run on another device

### 1) Clone repository
```bash
git clone https://github.com/sandeepaMallawarachchi/smart-lms.git
cd smart-lms/frontend
```

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment (`frontend/.env.local`)
Add only what your local setup needs:
```env
# Chat proxy target (optional if default is used)
CHATBOT_URL=http://localhost:5001/chat

# Feature aggregation -> heatmap service target (optional if default is used)
HEATMAP_SERVICE_URL=http://localhost:5002/heatmap
```

### 4) Start frontend
```bash
npm run dev
```

Open: `http://localhost:3000`

## Services required for full Learning Analytics flow

For all pages/features to work end-to-end, run these services as well:

1. Learning Analytics backend (Flask): `http://127.0.0.1:5000`
2. Heatmap backend (Flask): `http://localhost:5002`
3. Chatbot backend (Flask): `http://localhost:5001` (if chatbot is used)
4. Frontend Next API dependencies (MongoDB and auth-related backend connectivity used by your project)

## Notes
- Learning goals now use status-only workflow: `todo`, `inprogress`, `done`.
- Sidebar goal submenu can filter the goals page by status or open the create modal via query params.
