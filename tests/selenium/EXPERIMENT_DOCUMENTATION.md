# Selenium Test Suite - Experiment Documentation

## Project: SecureExam Proctoring System
## Test Framework: Selenium WebDriver with Python

---

## Overview

This document describes the Selenium test suite created for the SecureExam online proctoring system, following the reference structure from a library management system project.

### Technology Stack

- **Application Under Test:** Next.js 15 + React 19 + TypeScript
- **Testing Framework:** Selenium WebDriver 4.15.2
- **Programming Language:** Python 3.8+
- **Browser:** Chrome (Headless mode)
- **Test Runner:** Python unittest

---

## Test Suite Structure

### File Organization

```
tests/selenium/
├── selenium_test_runner.py       # Main test runner
├── selenium_test_cases.py        # Complete test suite (12 tests)
├── base_test_setup.py            # Base test utilities
├── test_01_homepage.py           # Individual: Homepage test
├── test_02_auth_page.py          # Individual: Auth page test
├── test_03_student_registration.py  # Individual: Student reg
├── test_04_teacher_registration.py  # Individual: Teacher reg
├── test_05_dashboard_access.py   # Individual: Dashboard access
├── test_06_api_health.py         # Individual: API health
├── requirements.txt              # Python dependencies
├── README.md                     # Comprehensive documentation
└── QUICKSTART.md                 # Quick start guide
```

---

## Test Cases Implemented

### 1. Homepage Load Test
**File:** `test_01_homepage.py`  
**Purpose:** Verify homepage loads with correct content  
**Assertions:**
- Page body is present
- "SecureExam" or "proctoring" text exists
- Page loads within timeout

### 2. Authentication Page Display Test
**File:** `test_02_auth_page.py`  
**Purpose:** Verify auth page displays correctly  
**Assertions:**
- URL contains "/auth"
- Email/password fields present
- Login/register options visible

### 3. Student Registration Test
**File:** `test_03_student_registration.py`  
**Purpose:** Verify student can register successfully  
**Actions:**
1. Navigate to /auth
2. Switch to register form
3. Fill name, email, password
4. Select student role
5. Submit form
**Assertions:**
- Redirects to dashboard
- Registration successful

### 4. Teacher Registration Test
**File:** `test_04_teacher_registration.py`  
**Purpose:** Verify teacher can register successfully  
**Actions:**
1. Navigate to /auth
2. Switch to register form
3. Fill name, email, password
4. Select teacher role
5. Submit form
**Assertions:**
- Redirects to dashboard
- Registration successful

### 5. Dashboard Access Control Test
**File:** `test_05_dashboard_access.py`  
**Purpose:** Verify protected routes require authentication  
**Routes Tested:**
- /dashboard
- /dashboard/student
- /dashboard/teacher
**Assertions:**
- Unauthenticated users redirected to /auth
- Protected routes secured

### 6. API Health Check Test
**File:** `test_06_api_health.py`  
**Purpose:** Verify API endpoint responds  
**Endpoint:** `/api/health`  
**Assertions:**
- Response contains success indicators
- API is operational

### 7. Student Dashboard Display Test
**Purpose:** Verify student dashboard renders correctly  
**Elements Checked:**
- Statistics cards (Total Exams, Completed, Average Score, Upcoming)
- Available exams section
- Upcoming exams section
- Recent results section

### 8. Teacher Dashboard Display Test
**Purpose:** Verify teacher dashboard renders correctly  
**Elements Checked:**
- Statistics cards (Total Exams, Active, Students, Completed)
- Quick action buttons
- Active exams list

### 9. Exam Creation Page Access Test
**Purpose:** Verify exam creation page is accessible  
**Route:** `/dashboard/teacher/create-exam`  
**Verification:** Page loads or redirects appropriately

### 10. Question Bank Page Access Test
**Purpose:** Verify question bank page is accessible  
**Route:** `/dashboard/teacher/questions`  
**Verification:** Page loads or redirects appropriately

### 11. Security - Protected Routes Test
**Purpose:** Comprehensive security testing  
**Routes Tested:**
- /dashboard
- /dashboard/student
- /dashboard/teacher
- /dashboard/teacher/create-exam
**Verification:** All routes redirect unauthenticated users to login

### 12. Page Responsiveness Test
**Purpose:** Performance testing  
**Pages Tested:**
- Homepage (/)
- Auth page (/auth)
**Assertion:** All pages load within 10 seconds

---

## Key Features

### Test Runner (`selenium_test_runner.py`)

#### Features:
1. **Automated WebDriver Setup**
   - Installs ChromeDriver automatically
   - Configures headless mode
   - Sets optimal window size (1920x1080)

2. **Test Data Management**
   - Pre-configured test users
   - Timestamped email generation for unique registrations
   - Test exam templates

3. **Comprehensive Reporting**
   - Test execution summary
   - Success rate calculation
   - Detailed pass/fail information

#### Configuration:
```python
Base URL: http://localhost:3000
Implicit Wait: 10 seconds
Browser: Chrome (Headless)
Window Size: 1920x1080
```

### Base Test Utilities (`base_test_setup.py`)

#### Utility Methods:

1. **`wait_for_element(by, value, timeout=10)`**
   - Waits for element to be present
   - Returns element when found
   - Raises TimeoutException if not found

2. **`wait_for_clickable(by, value, timeout=10)`**
   - Waits for element to be clickable
   - Returns element when clickable
   - Handles dynamic content loading

3. **`get_flash_messages()`**
   - Extracts alert/toast messages
   - Returns list of message texts
   - Useful for verification

4. **`clear_cookies()`**
   - Clears all browser cookies
   - Ensures clean test state
   - Prevents authentication persistence

---

## Test Execution Workflow

### 1. Pre-Test Setup
```
Initialize WebDriver → Configure Chrome Options → Start Browser
```

### 2. Test Execution
```
Load Page → Wait for Elements → Perform Actions → Verify Results
```

### 3. Post-Test Cleanup
```
Take Screenshots (if failed) → Close Browser → Generate Report
```

---

## Comparison with Reference Project

### Similarities (Library Management Project Pattern)

| Aspect | Reference | This Project |
|--------|-----------|--------------|
| Test Runner | `selenium_test_runner.py` | ✓ Same |
| Base Setup | `base_test_setup.py` | ✓ Same pattern |
| Individual Tests | Separate files per test | ✓ Implemented |
| Test Categories | Homepage, Auth, Forms, API | ✓ Similar |

### Adaptations for SecureExam

| Feature | Library System | SecureExam System |
|---------|---------------|-------------------|
| Tech Stack | Flask + SQLAlchemy | Next.js + Prisma |
| Server Start | Flask dev server | Manual (npm run dev) |
| Database Setup | SQLite in-memory | PostgreSQL (external) |
| Auth Method | Session-based | JWT token-based |
| User Roles | Admin, User | Teacher, Student |
| Test Focus | Books, Feedback | Exams, Proctoring |

---

## Installation & Usage

### Prerequisites
```powershell
# 1. Start Next.js application
npm run dev

# 2. Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
cd tests\selenium
pip install -r requirements.txt
```

### Running Tests

**All Tests:**
```powershell
python selenium_test_runner.py
```

**Individual Tests:**
```powershell
python -m unittest test_01_homepage.py
```

**With Verbose Output:**
```powershell
python selenium_test_runner.py -v
```

---

## Test Results & Metrics

### Expected Test Execution Time
- Individual test: 2-7 seconds
- Full suite (12 tests): 2-3 minutes

### Success Criteria
- All 12 tests pass
- No timeouts or exceptions
- Pages load within 10 seconds
- Protected routes properly secured

### Example Output
```
Tests run: 12
Failures: 0
Errors: 0
Success Rate: 100.00%
```

---

## Advantages of This Test Suite

### 1. Comprehensive Coverage
- Authentication flows
- Authorization/security
- UI rendering
- API endpoints
- Performance

### 2. Maintainability
- Modular test structure
- Reusable utilities
- Clear naming conventions
- Well-documented code

### 3. Automation-Ready
- Headless execution
- CI/CD compatible
- Automated reporting
- No manual intervention required

### 4. Scalability
- Easy to add new tests
- Base class for common functionality
- Individual test files for organization
- Configurable parameters

---

## Future Enhancements

### Potential Additions

1. **Exam Taking Flow**
   - Complete exam submission
   - Answer question types (MCQ, Essay)
   - Timer verification
   - Auto-save functionality

2. **Proctoring Features**
   - Webcam activation test
   - Tab switch detection
   - Fullscreen enforcement
   - Screenshot capture

3. **Grading System**
   - Automatic grading for MCQ
   - Manual grading workflow
   - Score calculation
   - Result display

4. **Advanced Security Tests**
   - CSRF token validation
   - XSS prevention
   - SQL injection attempts
   - Rate limiting

5. **Performance Testing**
   - Load time benchmarks
   - Response time metrics
   - Concurrent user simulation

---

## Troubleshooting Guide

### Common Issues

#### 1. WebDriver Error
```
Error: WebDriver not found
Solution: pip install --upgrade webdriver-manager
```

#### 2. Connection Refused
```
Error: Connection to localhost:3000 refused
Solution: Start Next.js app with: npm run dev
```

#### 3. Element Not Found
```
Error: NoSuchElementException
Solution: Check element selectors, increase timeouts
```

#### 4. Database Issues
```
Error: User already exists
Solution: Use timestamped emails or reset database
```

---

## Experiment Conclusion

### Successfully Implemented
✓ 12 comprehensive test cases  
✓ Modular, maintainable structure  
✓ Reference pattern adapted successfully  
✓ Automated WebDriver setup  
✓ Detailed documentation  

### Testing Coverage
✓ Authentication & Authorization  
✓ User Registration (Student & Teacher)  
✓ Dashboard Access Control  
✓ API Health Monitoring  
✓ Security & Performance  

### Best Practices Followed
✓ DRY principle (Don't Repeat Yourself)  
✓ Clear test naming  
✓ Comprehensive assertions  
✓ Proper cleanup  
✓ Extensive documentation  

---

## References

### Documentation
- Selenium WebDriver: https://www.selenium.dev/documentation/
- Python unittest: https://docs.python.org/3/library/unittest.html
- WebDriver Manager: https://github.com/SergeyPirogov/webdriver_manager

### Project Structure Reference
Based on library management system test patterns adapted for:
- Modern Next.js architecture
- JWT authentication
- Role-based access control
- RESTful API design

---

## Author Notes

This test suite demonstrates:
- Adaptation of reference patterns to different tech stacks
- Comprehensive E2E testing approach
- Professional test documentation
- Production-ready test automation

The implementation successfully bridges Flask-based patterns to modern Next.js applications while maintaining test quality and coverage.

---

**End of Documentation**
