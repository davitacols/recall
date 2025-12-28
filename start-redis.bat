@echo off
echo Starting Redis with Docker...
docker-compose up -d
echo.
echo Redis is running on localhost:6379
echo.
echo To stop Redis: docker-compose down
echo To view logs: docker-compose logs -f redis
