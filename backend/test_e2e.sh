#!/bin/bash
# test_e2e.sh
set -e

echo "Starting backend..."
npm run start:dev &
BACKEND_PID=$!
sleep 5 # wait for server to start

API_URL="http://localhost:3000"

echo "1. Creating Admin User..."
# Note: we assume the user might need to bypass normal flow for testing, or we just test normal users.
# Actually, let's just make a curl request to register an admin user if not exists, or normal user.
# First, let's login or register.
RES=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d '{"email": "admin2@test.com", "password": "password", "name": "Admin Test", "classId": 1, "role": "admin"}')
echo $RES
TOKEN=$(echo $RES | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo "Register failed, trying login..."
    RES=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"email": "admin2@test.com", "password": "password"}')
    TOKEN=$(echo $RES | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')
fi

echo "Admin Token: $TOKEN"

echo "2. Testing Admin Endpoints..."
RES=$(curl -s -X POST "$API_URL/tasks" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title": "Test Task", "description": "Desc", "type": "bubble_sort", "config": {"array": [1,2], "stepsToPredict": 1}}')
echo "Create task: $RES"
TASK_ID=$(echo $RES | grep -o '"id":[^,]*' | grep -o '[0-9]*')

echo "3. Assigning Task to Today..."
TODAY=$(date -u +%Y-%m-%dT00:00:00.000Z) # Simplified, the backend uses its own logic anyway.
RES=$(curl -s -X POST "$API_URL/assignments" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"taskId\": $TASK_ID, \"date\": \"$TODAY\"}")
echo "Assign task: $RES"

echo "4. Creating Normal User..."
RES=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d '{"email": "user2@test.com", "password": "password", "name": "User Test", "classId": 1}')
echo $RES
USER_TOKEN=$(echo $RES | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$USER_TOKEN" ]; then
    echo "Register failed, trying login..."
    RES=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"email": "user2@test.com", "password": "password"}')
    USER_TOKEN=$(echo $RES | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')
fi

echo "User Token: $USER_TOKEN"

echo "5. Testing Submissions & Daily tasks..."
RES=$(curl -s -X GET "$API_URL/daily" -H "Authorization: Bearer $USER_TOKEN")
echo "Daily tasks: $RES"

echo "6. Testing Security (User accessing Admin Stats)..."
RES=$(curl -s -X GET "$API_URL/stats" -H "Authorization: Bearer $USER_TOKEN")
echo "User accessing stats: $RES" # Should be 403 Forbidden

echo "7. Clean up backend..."
kill $BACKEND_PID
echo "Done!"
