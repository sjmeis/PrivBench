#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting authentication tests..."

# Create/clear cookies file
> cookies.txt

# Function to print response
print_response() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Success${NC}"
    else
        echo -e "${RED}Failed${NC}"
    fi
    echo "Response: $1"
    echo "------------------------"
}

# Test 1: Register
echo "Testing registration..."
RESPONSE=$(curl -s -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' \
  -c cookies.txt)
print_response "$RESPONSE"

# Test 2: Duplicate registration
echo "Testing duplicate registration..."
RESPONSE=$(curl -s -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}')
print_response "$RESPONSE"

# Test 3: Login
echo "Testing login..."
RESPONSE=$(curl -s -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' \
  -c cookies.txt)
print_response "$RESPONSE"

# Test 4: Get user
echo "Testing get user..."
RESPONSE=$(curl -s -X GET http://localhost:5000/user \
  -b cookies.txt)
print_response "$RESPONSE"

# Test 5: Check auth
echo "Testing auth check..."
RESPONSE=$(curl -s -X GET http://localhost:5000/check-auth \
  -b cookies.txt)
print_response "$RESPONSE"

# Test 6: Logout
echo "Testing logout..."
RESPONSE=$(curl -s -X POST http://localhost:5000/logout \
  -b cookies.txt)
print_response "$RESPONSE"

# Test 7: Access after logout
echo "Testing protected route after logout..."
RESPONSE=$(curl -s -X GET http://localhost:5000/user \
  -b cookies.txt)
print_response "$RESPONSE"

echo "Testing complete!"