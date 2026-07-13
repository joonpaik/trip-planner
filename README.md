# TripPlanner+

A group trip-planning app: shared itineraries, per-task cost splitting, a cross-trip calendar, and a to-do/expenses view, so a group trip doesn't have to run on a group chat.

## 🏗️ Architecture

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Python FastAPI + SQLAlchemy
- **Database:** PostgreSQL
- **Auth:** JWT access/refresh tokens (python-jose, passlib, bcrypt)
- **Email:** SMTP for verification and password-reset links (falls back to logging the link when no SMTP server is configured, e.g. local dev)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL (running locally or reachable via `DATABASE_URL`)
- Git

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/trip-planner.git
cd trip-planner

# Configure the backend
cp backend/.env.example backend/.env
# then fill in DATABASE_URL (postgresql://...), JWT_SECRET, and SMTP_* if you want real emails sent

# Install dependencies
make install

# Start development
make dev
```

## ✨ Features

- **Trip itinerary builder** — ordered stops with drag-to-reorder and address autocomplete
- **Task cost splitting** — split any task's cost by dollar amount or percentage across assignees, with a per-trip cost summary
- **Roles** — trip admins and participants, with self-healing admin reassignment if an admin leaves or is deactivated
- **Home dashboard** — every trip at a glance: itinerary progress, budget, readiness, and participant progress
- **Calendar** — every trip's dates in one color-coded, shareable calendar
- **To-Do** — a cross-trip task list, filterable by trip, status, and person
- **Expenses** — grand total, what you owe, and cost broken down by trip and by person

## 🛠️ Development Workflow

```bash
# Start development environment
make dev

# Or with Docker
docker-compose up

# Run tests
make test

# Create new feature
git checkout main
git checkout -b feature/my-feature
# ... make changes ...
git commit -m "feat: add my feature"
git push origin feature/my-feature
```
