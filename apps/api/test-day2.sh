#!/bin/bash

# Day 2 Integration Testing Script
echo "======================================"
echo "Day 2 Integration Testing"
echo "======================================"
echo ""

API_URL="http://localhost:3001/api/v1"
AUTH_URL="http://localhost:3001/api/auth"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

echo "Phase 1: Testing Demo User 1 (OWNER) Access"
echo "-------------------------------------------"

# Login as demo user 1
echo "Logging in as demo1@collabdev.com..."
DEMO1_LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/sign-in/email" \
  -H "Content-Type: application/json" \
  -c demo1_cookies.txt \
  -d '{
    "email": "demo1@collabdev.com",
    "password": "password123"
  }')

if echo "$DEMO1_LOGIN_RESPONSE" | grep -q "user"; then
  print_result 0 "Demo user 1 login successful"
else
  print_result 1 "Demo user 1 login failed"
  echo "Response: $DEMO1_LOGIN_RESPONSE"
fi

# Get projects for demo user 1
echo "Fetching projects for demo user 1..."
DEMO1_PROJECTS=$(curl -s -X GET "$API_URL/project" \
  -b demo1_cookies.txt)

if echo "$DEMO1_PROJECTS" | grep -q "Shared Project Alpha"; then
  print_result 0 "Demo user 1 can see shared project"

  # Extract project ID
  PROJECT_ID=$(echo "$DEMO1_PROJECTS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Project ID: $PROJECT_ID"

  # Check role
  if echo "$DEMO1_PROJECTS" | grep -q '"myRole":"OWNER"'; then
    print_result 0 "Demo user 1 has OWNER role"
  else
    print_result 1 "Demo user 1 does not have OWNER role"
  fi
else
  print_result 1 "Demo user 1 cannot see shared project"
fi

echo ""
echo "Phase 2: Testing Demo User 2 (MEMBER) Access"
echo "--------------------------------------------"

# Login as demo user 2
echo "Logging in as demo2@collabdev.com..."
DEMO2_LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/sign-in/email" \
  -H "Content-Type: application/json" \
  -c demo2_cookies.txt \
  -d '{
    "email": "demo2@collabdev.com",
    "password": "password123"
  }')

if echo "$DEMO2_LOGIN_RESPONSE" | grep -q "user"; then
  print_result 0 "Demo user 2 login successful"
else
  print_result 1 "Demo user 2 login failed"
  echo "Response: $DEMO2_LOGIN_RESPONSE"
fi

# Get projects for demo user 2
echo "Fetching projects for demo user 2..."
DEMO2_PROJECTS=$(curl -s -X GET "$API_URL/project" \
  -b demo2_cookies.txt)

if echo "$DEMO2_PROJECTS" | grep -q "Shared Project Alpha"; then
  print_result 0 "Demo user 2 can see shared project"

  # Check role
  if echo "$DEMO2_PROJECTS" | grep -q '"myRole":"MEMBER"'; then
    print_result 0 "Demo user 2 has MEMBER role"
  else
    print_result 1 "Demo user 2 does not have MEMBER role"
  fi
else
  print_result 1 "Demo user 2 cannot see shared project"
fi

echo ""
echo "Phase 3: Testing Redis Caching"
echo "-------------------------------"

# Test cache by making multiple requests
echo "First request (cache miss, should be slower)..."
time1_start=$(date +%s%N)
curl -s -X GET "$API_URL/project" -b demo1_cookies.txt > /dev/null
time1_end=$(date +%s%N)
time1=$((($time1_end - $time1_start) / 1000000))

echo "Second request (cache hit, should be faster)..."
time2_start=$(date +%s%N)
curl -s -X GET "$API_URL/project" -b demo1_cookies.txt > /dev/null
time2_end=$(date +%s%N)
time2=$((($time2_end - $time2_start) / 1000000))

echo "First request: ${time1}ms"
echo "Second request: ${time2}ms"

if [ $time2 -lt $time1 ]; then
  print_result 0 "Redis caching is working (second request faster)"
else
  print_result 1 "Redis caching may not be working (second request not faster)"
fi

echo ""
echo "Phase 4: Testing Project Details"
echo "--------------------------------"

if [ -n "$PROJECT_ID" ]; then
  # Get project details
  echo "Fetching project details for $PROJECT_ID..."
  PROJECT_DETAILS=$(curl -s -X GET "$API_URL/project/$PROJECT_ID" \
    -b demo1_cookies.txt)

  if echo "$PROJECT_DETAILS" | grep -q "Shared Project Alpha"; then
    print_result 0 "Project details retrieved successfully"

    # Check members
    if echo "$PROJECT_DETAILS" | grep -q "demo1@collabdev.com" && echo "$PROJECT_DETAILS" | grep -q "demo2@collabdev.com"; then
      print_result 0 "Both users are members of the project"
    else
      print_result 1 "Not all users are members of the project"
    fi
  else
    print_result 1 "Failed to retrieve project details"
  fi
else
  print_result 1 "Project ID not available for testing"
fi

echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

# Cleanup
rm -f demo1_cookies.txt demo2_cookies.txt

if [ $TESTS_FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}All tests passed! ✓${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Verify Neo4j node in Neo4j Browser (http://localhost:7474)"
  echo "   Query: MATCH (p:Project) RETURN p"
  echo "2. Check Redis cache in Redis CLI"
  echo "   Command: KEYS project:user:*"
  echo "3. Test WebSocket presence tracking (manual testing required)"
  exit 0
else
  echo ""
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
