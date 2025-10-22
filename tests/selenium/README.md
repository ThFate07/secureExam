# Selenium Test Suite for SecureExam Proctoring System

## Overview
This directory contains Selenium-based end-to-end tests for the SecureExam proctoring system. The tests verify critical functionality including authentication, dashboard access, and API endpoints.

## Test Structure

### Main Files
- **`selenium_test_runner.py`** - Main test runner that initializes WebDriver and coordinates test execution
- **`selenium_test_cases.py`** - Comprehensive test suite with all 12 test cases
- **`base_test_setup.py`** - Base test class with common utilities

### Individual Test Files
1. **`test_01_homepage.py`** - Homepage load test
2. **`test_02_auth_page.py`** - Authentication page display test
3. **`test_03_student_registration.py`** - Student registration functionality
4. **`test_04_teacher_registration.py`** - Teacher registration functionality
5. **`test_05_dashboard_access.py`** - Dashboard protection and access control
6. **`test_06_api_health.py`** - API health endpoint verification

## Test Cases

### Test 1: Homepage Load Test
Verifies that the SecureExam homepage loads successfully with all key elements.

### Test 2: Authentication Page Display
Checks that the authentication page renders correctly with login/register forms.

### Test 3: Student Registration
Tests the complete student registration flow including form validation and redirect.

### Test 4: Teacher Registration
Tests the complete teacher registration flow with role selection.

### Test 5: Dashboard Access Control
Verifies that protected dashboard routes require authentication.

### Test 6: API Health Check
Ensures the API health endpoint responds correctly.

### Test 7: Student Dashboard Display
Verifies student dashboard displays correctly when authenticated.

### Test 8: Teacher Dashboard Display
Verifies teacher dashboard displays correctly when authenticated.

### Test 9: Exam Creation Page Access
Checks accessibility of the exam creation page.

### Test 10: Question Bank Page Access
Checks accessibility of the question bank management page.

### Test 11: Security - Protected Routes
Comprehensive security test for all protected routes.

### Test 12: Page Responsiveness Check
Performance test ensuring pages load within acceptable time.

## Prerequisites

### System Requirements
- Python 3.8 or higher
- Chrome browser installed
- Node.js 18+ (for Next.js app)

### Next.js Application
The Next.js application must be running before executing tests:
```powershell
# In the project root directory
npm install
npm run dev
```

The application should be accessible at `http://localhost:3000`

## Installation

1. **Navigate to the selenium test directory:**
   ```powershell
   cd tests\selenium
   ```

2. **Create a virtual environment (recommended):**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

## Running Tests

### Run All Tests
Execute the complete test suite:
```powershell
python selenium_test_runner.py
```

### Run Individual Test Files
Run specific test modules:
```powershell
# Homepage test
python -m unittest test_01_homepage.py

# Authentication page test
python -m unittest test_02_auth_page.py

# Student registration test
python -m unittest test_03_student_registration.py

# Teacher registration test
python -m unittest test_04_teacher_registration.py

# Dashboard access test
python -m unittest test_05_dashboard_access.py

# API health test
python -m unittest test_06_api_health.py
```

### Run with Verbose Output
```powershell
python selenium_test_runner.py -v
```

## Test Configuration

### Browser Settings
The tests run in **headless mode** by default. To run with visible browser:

Edit `selenium_test_runner.py`:
```python
# Comment out this line:
# chrome_options.add_argument("--headless")
```

### Base URL
Default: `http://localhost:3000`

To change the base URL, modify in `selenium_test_runner.py`:
```python
cls.base_url = "http://your-custom-url:port"
```

### Timeouts
Default implicit wait: 10 seconds

Modify in `selenium_test_runner.py`:
```python
cls.driver.implicitly_wait(10)  # Change value as needed
```

## Test Data

### Test Users
The runner creates test user credentials:

**Student:**
- Name: Test Student
- Email: student@test.com
- Password: TestPass123!
- Role: student

**Teacher:**
- Name: Test Teacher
- Email: teacher@test.com
- Password: TestPass123!
- Role: teacher

**Note:** Registration tests use timestamped emails to ensure uniqueness.

## Understanding Test Results

### Success Output
```
Test 1: Homepage Load Test
====================================================================
✅ [PASS] Homepage loaded successfully
   - Title: SecureExam
   - URL: http://localhost:3000/
```

### Failure Output
```
Test 3: Student Registration
====================================================================
❌ [FAIL] Student registration failed: Element not found
```

### Summary Report
```
Test Summary:
====================================================================
Tests run: 12
Failures: 0
Errors: 0
Success Rate: 100.00%
```

## Troubleshooting

### Common Issues

#### 1. WebDriver Not Found
**Error:** `WebDriver executable not found`

**Solution:**
```powershell
pip install --upgrade webdriver-manager
```

#### 2. Connection Refused
**Error:** `Failed to establish a connection`

**Solution:** Ensure Next.js app is running:
```powershell
npm run dev
```

#### 3. Element Not Found
**Error:** `NoSuchElementException`

**Solution:** 
- Check if page structure has changed
- Increase timeout values
- Verify application is fully loaded

#### 4. Chrome Version Mismatch
**Error:** `Chrome version mismatch`

**Solution:**
```powershell
pip install --upgrade selenium webdriver-manager
```

#### 5. Database Issues
**Error:** `User already exists`

**Solution:** Tests use timestamped emails, but if needed:
```powershell
# Reset database
npx prisma migrate reset
```

## Database Setup

For complete testing, ensure database is properly set up:

```powershell
# In project root
npx prisma generate
npx prisma db push
npx prisma db seed  # Optional: seed with test data
```

## Best Practices

1. **Always run Next.js app first** before executing tests
2. **Use fresh database** for consistent test results
3. **Run tests in order** to avoid conflicts
4. **Check console output** for detailed error messages
5. **Keep Chrome browser updated** for compatibility

## Continuous Integration

### GitHub Actions Example
```yaml
name: Selenium Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    
    - name: Install dependencies
      run: |
        npm install
        pip install -r tests/selenium/requirements.txt
    
    - name: Start Next.js
      run: npm run dev &
    
    - name: Wait for server
      run: sleep 10
    
    - name: Run Selenium tests
      run: python tests/selenium/selenium_test_runner.py
```

## Extending Tests

### Adding New Tests

1. **Create new test file:**
   ```python
   # test_07_new_feature.py
   from base_test_setup import BaseSeleniumTest
   
   class TestNewFeature(BaseSeleniumTest):
       def test_new_functionality(self):
           # Your test code here
           pass
   ```

2. **Add to selenium_test_cases.py:**
   ```python
   def test_07_new_feature(self):
       """Test 7: Description"""
       # Test implementation
       pass
   ```

### Test Utilities

Use the base class utilities:
```python
# Wait for element
element = self.wait_for_element(By.ID, "my-element")

# Wait for clickable
button = self.wait_for_clickable(By.CSS_SELECTOR, "button")

# Clear cookies
self.clear_cookies()

# Get flash messages
messages = self.get_flash_messages()
```

## Performance Benchmarks

Expected test execution times:
- Homepage Load: ~1-2 seconds
- Authentication Tests: ~3-5 seconds each
- Registration Tests: ~5-7 seconds each
- Full Suite: ~2-3 minutes

## Support

For issues or questions:
1. Check console output for detailed error messages
2. Verify all prerequisites are met
3. Review the troubleshooting section
4. Check application logs

## License

This test suite is part of the SecureExam project.

## Version History

- **v1.0** - Initial test suite with 12 test cases
  - Homepage and authentication tests
  - Registration flows for students and teachers
  - Dashboard access control
  - API health checks
  - Security and performance tests
