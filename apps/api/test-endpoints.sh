#!/bin/bash

# Test Script for Project API Endpoints
# Uses demo admin user: demo@collabdev.com / password123

BASE_URL="http://127.0.0.1:3001"
COOKIES="cookies.txt"

echo "================================"
echo "CollabDev+ Project API Test Suite"
echo "================================"
echo ""

# Clean up old cookies
rm -f $COOKIES

# Step 1: Login to get session
echo "1. Testing Authentication (Login)"
echo "-----------------------------------"
curl -X POST "${BASE_URL}/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@collabdev.com","password":"password123"}' \
  -c $COOKIES \
  -v 2>&1 | grep -E "(< HTTP|Set-Cookie|success)"
echo ""

# Step 2: Create a project
echo "2. Testing POST /api/project (Create Project)"
echo "-----------------------------------"
PROJECT_RESPONSE=$(curl -X POST "${BASE_URL}/api/project" \
  -H "Content-Type: application/json" \
  -b $COOKIES \
  -d '{"name":"Test Project Alpha","description":"A test project for API validation"}' \
  -s)
echo "$PROJECT_RESPONSE" | jq '.'
PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.id' 2>/dev/null || echo "")
echo "Project ID: $PROJECT_ID"
echo ""

# Step 3: List all projects
echo "3. Testing GET /api/project (List My Projects)"
echo "-----------------------------------"
curl -X GET "${BASE_URL}/api/project" \
  -H "Content-Type: application/json" \
  -b $COOKIES \
  -s | jq '.'
echo ""

# Step 4: Get specific project
if [ ! -z "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
  echo "4. Testing GET /api/project/:id (Get Project Details)"
  echo "-----------------------------------"
  curl -X GET "${BASE_URL}/api/project/${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -b $COOKIES \
    -s | jq '.'
  echo ""

  # Step 5: Update project
  echo "5. Testing PATCH /api/project/:id (Update Project)"
  echo "-----------------------------------"
  curl -X PATCH "${BASE_URL}/api/project/${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -b $COOKIES \
    -d '{"name":"Test Project Alpha - Updated","description":"Updated description for testing"}' \
    -s | jq '.'
  echo ""

  # Step 6: Get project members
  echo "6. Testing GET /api/project/:id/members (List Members)"
  echo "-----------------------------------"
  curl -X GET "${BASE_URL}/api/project/${PROJECT_ID}/members" \
    -H "Content-Type: application/json" \
    -b $COOKIES \
    -s | jq '.'
  echo ""

  # Step 7: Try to add a member (will need a second user ID)
  echo "7. Testing POST /api/project/:id/members (Add Member)"
  echo "-----------------------------------"
  echo "Note: This requires a second user. Creating temporary user first..."

  # Get the admin user ID to test authorization
  ADMIN_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.createdByUserId' 2>/dev/null || echo "")

  if [ ! -z "$ADMIN_ID" ] && [ "$ADMIN_ID" != "null" ]; then
    # Try to add a member with a fake ID (expect failure)
    curl -X POST "${BASE_URL}/api/project/${PROJECT_ID}/members" \
      -H "Content-Type: application/json" \
      -b $COOKIES \
      -d "{\"userId\":\"fake-user-id-123\",\"role\":\"MEMBER\"}" \
      -s | jq '.'
  fi
  echo ""

  # Step 8: Delete project
  echo "8. Testing DELETE /api/project/:id (Delete Project)"
  echo "-----------------------------------"
  curl -X DELETE "${BASE_URL}/api/project/${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -b $COOKIES \
    -s | jq '.'
  echo ""

  # Step 9: Verify deletion
  echo "9. Verifying Deletion (Should return 404 or empty)"
  echo "-----------------------------------"
  curl -X GET "${BASE_URL}/api/project/${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -b $COOKIES \
    -s | jq '.'
  echo ""
else
  echo "Failed to create project, skipping remaining tests"
fi

echo "================================"
echo "Test Suite Complete!"
echo "================================"

# Cleanup
rm -f $COOKIES
