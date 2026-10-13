# NexusFlow

Modern project management and productivity platform for focused teams.

## Project Overview

NexusFlow is a full-stack productivity SaaS application designed for project planning, task execution, notifications, analytics, and team collaboration. The stack combines a Django REST API with a React + Vite frontend and a PostgreSQL data layer.

## Architecture

```text
User
 │
 ▼
Route 53
 │
 ▼
AWS Amplify
 │
 ▼
React Frontend
 │
 ▼
AWS App Runner
 │
 ▼
Django REST API
 │
 ▼
AWS RDS PostgreSQL
```

## Features

- Project management with roles and permissions
- Task tracking with status, priority, deadlines, and assignment
- Comments, notifications, and activity logs
- Analytics dashboard powered by ORM aggregation
- JWT authentication and secure API access
- Responsive SaaS interface with desktop and mobile support

## Tech Stack

- Frontend: React, Vite, JavaScript, Axios, React Router
- Backend: Django, DRF, Simple JWT, Django CORS Headers, PostgreSQL, Pillow
- Deployment: AWS Amplify, AWS App Runner, AWS RDS PostgreSQL

## Folder Structure

```text
FullStackApp/
├── backend/
├── frontend/
├── docs/
├── docker-compose.yml
├── .gitignore
├── README.md
└── .github/
```

## Local Setup

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend

```env
SECRET_KEY=replace-with-your-secret-key
DEBUG=True
DB_NAME=fullstackapp
DB_USER=fullstackuser
DB_PASSWORD=fullstackpassword
DB_HOST=127.0.0.1
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## API Overview

- Health: GET /api/health/
- Auth: POST /api/auth/register/, POST /api/auth/login/, POST /api/auth/refresh/
- Profiles: GET /api/profile/, PATCH /api/profile/
- Projects: CRUD + members support
- Tasks: CRUD + filtering + ordering
- Comments: CRUD
- Attachments: CRUD upload support
- Notifications: list and mark-as-read
- Activity: list relevant workspace activity
- Analytics: aggregated workspace metrics

## Testing

```bash
cd backend
python manage.py test
python manage.py makemigrations --check
```

## CI/CD

GitHub Actions workflows are included for:

- backend CI
- frontend CI

These validate dependency installation and build/test health for each stack.

## Production Deployment

NexusFlow is designed for deployment on:

- AWS Amplify for the React frontend
- AWS App Runner for the Django API
- AWS RDS PostgreSQL for persistence
- AWS S3 for file uploads (optional extension)
- Route 53 and ACM for DNS and TLS

## Security Notes

- No secrets are committed to source control.
- JWT is used for authenticated API traffic.
- Production environment variables are required for config.
- CORS is restricted to trusted origins.
- See [feature configuration](docs/feature-configuration.md) for avatar storage, browser notification, and email digest prerequisites.

## Troubleshooting

- If Postgres is unavailable, run docker compose up -d postgres.
- If JWT login fails, verify the backend env is loaded and the database migration state is current.
- If the frontend cannot reach the API, confirm the VITE_API_BASE_URL value matches the backend host and port.

## Future Improvements

- Richer project member permissions and role enforcement
- File storage integration with S3
- Advanced analytics charts and filtering
- Team invites and workspace settings
- Real-time updates via WebSockets
