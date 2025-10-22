# Quick Start Guide - Selenium Tests

## Setup (5 minutes)

### 1. Start the Next.js Application
```powershell
# In project root directory
npm run dev
```
Wait for the message: `Ready on http://localhost:3000`

### 2. Install Test Dependencies
```powershell
# Navigate to selenium tests directory
cd tests\selenium

# Create virtual environment (recommended)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install required packages
pip install -r requirements.txt
```

### 3. Run Tests
```powershell
# Run all tests
python selenium_test_runner.py
```

## Expected Output

```
================================================================================
SecureExam Proctoring System - Selenium Test Runner
================================================================================

Starting Next.js development server...
Please ensure the Next.js app is running on port 3000
Run: npm run dev
Waiting for server to start...
✅ Chrome WebDriver initialized

✅ Test data configured

================================================================================
Running Selenium Tests...
================================================================================

test_01_homepage_loads ... 
============================================================
Test 1: Homepage Load Test
============================================================
✅ [PASS] Homepage loaded successfully
   - Title: ...
   - URL: http://localhost:3000/
ok

test_02_navigation_to_auth_page ... 
============================================================
Test 2: Navigation to Auth Page
============================================================
✅ [PASS] Navigation to auth page successful
   - Current URL: http://localhost:3000/auth
ok

... (more tests)

================================================================================
Test Summary:
================================================================================
Tests run: 12
Failures: 0
Errors: 0
Success Rate: 100.00%
```

## Troubleshooting

### Issue: "Connection refused"
**Fix:** Make sure Next.js is running on port 3000
```powershell
npm run dev
```

### Issue: "WebDriver not found"
**Fix:** Reinstall selenium packages
```powershell
pip install --upgrade selenium webdriver-manager
```

### Issue: "Module not found"
**Fix:** Make sure you're in the correct directory
```powershell
cd tests\selenium
```

## Test Descriptions

| Test # | Name | What it Tests |
|--------|------|---------------|
| 1 | Homepage Load | Homepage loads successfully |
| 2 | Auth Navigation | Can navigate to login/register page |
| 3 | Student Registration | Students can register |
| 4 | Teacher Registration | Teachers can register |
| 5 | Dashboard Access | Protected routes require auth |
| 6 | API Health | API endpoint responds |
| 7 | Student Dashboard | Student dashboard displays |
| 8 | Teacher Dashboard | Teacher dashboard displays |
| 9 | Exam Creation | Exam creation page accessible |
| 10 | Question Bank | Question bank page accessible |
| 11 | Security | All protected routes secured |
| 12 | Performance | Pages load quickly |

## Next Steps

- Review detailed results in console output
- Check `README.md` for advanced configuration
- Extend tests by creating new test files
- Integrate with CI/CD pipeline

## Need Help?

See the main README.md for:
- Detailed troubleshooting
- Configuration options
- How to add new tests
- CI/CD integration
