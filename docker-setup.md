# Docker Setup - Backend Only

Run the backend container using environment variables from `.env` file.

## Prerequisites

Ensure `.env` file exists with required configuration.

## Build Backend Image

```bash
docker build -t pulseops-backend:latest .
```

## Run Backend Container

```bash
docker run -d \
  --name pulseops-app \
  --network hrm-backend-main_pulseops-network \
  -p 5001:5000 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  pulseops-backend:latest
```

## Test

```bash
curl http://localhost:5001/health
```

## Common Commands

```bash
# View logs
docker logs -f pulseops-app

# Stop
docker stop pulseops-app

# Start
docker start pulseops-app

# Remove
docker rm -f pulseops-app

# Rebuild and restart
docker rm -f pulseops-app && docker build -t pulseops-backend:latest . && docker run -d --name pulseops-app --network hrm-backend-main_pulseops-network -p 5001:5000 --env-file .env -v $(pwd)/logs:/app/logs pulseops-backend:latest
```
