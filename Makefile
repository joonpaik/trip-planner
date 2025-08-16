.PHONY: install dev test build clean docker-up docker-down

install:
	cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

dev:
	@echo "Starting development servers..."
	cd backend && source venv/bin/activate && uvicorn main:app --reload &
	cd frontend && npm start

test:
	cd backend && source venv/bin/activate && python -m pytest tests/ -v
	cd frontend && npm test -- --coverage --watchAll=false

build:
	cd frontend && npm run build
	cd backend && source venv/bin/activate && python -m pytest

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down -v

clean:
	docker-compose down -v
	docker system prune -f
	cd frontend && rm -rf node_modules build
	cd backend && rm -rf __pycache__ .pytest_cache