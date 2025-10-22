# Test Architecture Diagram

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   SecureExam Application                     │
│                  (Next.js + React + Prisma)                  │
│                    http://localhost:3000                     │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                    HTTP Requests
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Selenium Test Suite                         │
│                  (Python + Selenium)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                 ┌──────────────────┐
│  Test Runner     │                 │  WebDriver       │
│  (Orchestrator)  │◄───manages────►│  (Chrome)        │
└──────────────────┘                 └──────────────────┘
        │
        │ executes
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                     Test Cases                               │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐   │
│  │ Test 1 │ Test 2 │ Test 3 │ Test 4 │ Test 5 │ Test 6 │   │
│  │ Test 7 │ Test 8 │ Test 9 │Test 10 │Test 11 │Test 12 │   │
│  └────────┴────────┴────────┴────────┴────────┴────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Test Execution Flow

```
START
  │
  ├─► 1. Initialize WebDriver (ChromeDriver)
  │
  ├─► 2. Configure Browser (Headless mode, window size)
  │
  ├─► 3. Setup Test Data (Test users, exam templates)
  │
  ├─► 4. Execute Tests
  │     │
  │     ├─► Test 1: Homepage Load
  │     │     ├─ Navigate to /
  │     │     ├─ Wait for elements
  │     │     └─ Verify content
  │     │
  │     ├─► Test 2: Auth Page
  │     │     ├─ Navigate to /auth
  │     │     ├─ Check form fields
  │     │     └─ Verify elements
  │     │
  │     ├─► Test 3: Student Registration
  │     │     ├─ Fill registration form
  │     │     ├─ Select student role
  │     │     ├─ Submit form
  │     │     └─ Verify redirect
  │     │
  │     ├─► Test 4: Teacher Registration
  │     │     ├─ Fill registration form
  │     │     ├─ Select teacher role
  │     │     ├─ Submit form
  │     │     └─ Verify redirect
  │     │
  │     ├─► Test 5: Dashboard Access
  │     │     ├─ Clear cookies
  │     │     ├─ Try accessing protected routes
  │     │     └─ Verify redirect to /auth
  │     │
  │     ├─► Test 6: API Health
  │     │     ├─ Call /api/health
  │     │     └─ Verify response
  │     │
  │     ├─► Test 7-12: Additional Tests
  │     │
  │     └─► All tests complete
  │
  ├─► 5. Generate Report
  │     ├─ Count passed tests
  │     ├─ Count failed tests
  │     └─ Calculate success rate
  │
  ├─► 6. Cleanup
  │     ├─ Close browser
  │     └─ Terminate WebDriver
  │
END
```

## File Structure & Dependencies

```
tests/selenium/
│
├── selenium_test_runner.py ◄────┐ (Main Entry Point)
│   ├─ Imports                    │
│   │  ├─ selenium                │
│   │  ├─ webdriver_manager       │
│   │  └─ selenium_test_cases ────┘
│   │
│   ├─ Class: SeleniumTestRunner
│   │  ├─ setUpClass()
│   │  ├─ setup_test_data()
│   │  └─ tearDownClass()
│   │
│   └─ Function: run_tests()
│
├── selenium_test_cases.py ◄────┐
│   ├─ Imports                   │
│   │  └─ unittest               │
│   │                            │
│   └─ Class: ProctoringSystemSeleniumTests
│      ├─ test_01_homepage_loads()
│      ├─ test_02_navigation_to_auth_page()
│      ├─ test_03_student_registration()
│      ├─ test_04_teacher_registration()
│      ├─ test_05_student_login()
│      ├─ test_06_student_dashboard_display()
│      ├─ test_07_teacher_dashboard_display()
│      ├─ test_08_exam_creation_page_access()
│      ├─ test_09_question_bank_page_access()
│      ├─ test_10_api_health_check()
│      ├─ test_11_protected_routes_security()
│      └─ test_12_page_responsiveness()
│
├── base_test_setup.py ◄────────┐
│   └─ Class: BaseSeleniumTest   │
│      ├─ setUpClass()           │
│      ├─ wait_for_element()     │
│      ├─ wait_for_clickable()   │
│      ├─ get_flash_messages()   │
│      └─ clear_cookies()        │
│                                │
├── test_01_homepage.py ─────────┤
├── test_02_auth_page.py ────────┤
├── test_03_student_registration.py ──┤
├── test_04_teacher_registration.py ──┤
├── test_05_dashboard_access.py ──────┤
└── test_06_api_health.py ────────────┘
    (All inherit from BaseSeleniumTest)
```

## Test Data Flow

```
┌──────────────────────────┐
│   Test Data Setup        │
│  (setup_test_data())     │
└──────────────────────────┘
            │
            ├─► test_users {
            │     student: {
            │       name: "Test Student"
            │       email: "student@test.com"
            │       password: "TestPass123!"
            │       role: "student"
            │     }
            │     teacher: {
            │       name: "Test Teacher"
            │       email: "teacher@test.com"
            │       password: "TestPass123!"
            │       role: "teacher"
            │     }
            │   }
            │
            └─► test_exam {
                  title: "Test Exam - Selenium"
                  description: "Test exam created by automation"
                  duration: 60
                  totalMarks: 100
                }
```

## Test Assertion Flow

```
Test Execution
      │
      ├─► Navigate to Page
      │     │
      │     └─► Wait for Element Load
      │           │
      │           ├─ Success → Continue
      │           └─ Timeout → FAIL
      │
      ├─► Perform Actions
      │     │
      │     ├─► Fill Forms
      │     ├─► Click Buttons
      │     └─► Submit Data
      │
      └─► Verify Results
            │
            ├─► Check URL
            ├─► Check Page Content
            ├─► Check Elements
            └─► Assert Conditions
                  │
                  ├─ All Pass → TEST PASS ✓
                  └─ Any Fail → TEST FAIL ✗
```

## Browser Automation Flow

```
Python Test Code
      │
      │ execute
      ▼
WebDriver API
      │
      │ translate
      ▼
WebDriver Protocol
      │
      │ communicate
      ▼
ChromeDriver
      │
      │ control
      ▼
Chrome Browser
      │
      │ render
      ▼
Web Application
      │
      │ respond
      ▼
Chrome Browser
      │
      │ return data
      ▼
WebDriver
      │
      │ process
      ▼
Test Assertions
```

## Test Suite Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Suite Layers                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: Test Runner
├─ Orchestrates test execution
├─ Manages WebDriver lifecycle
├─ Configures test environment
└─ Generates reports

Layer 2: Test Cases
├─ Individual test methods
├─ Test scenarios and flows
├─ Assertions and verifications
└─ Test-specific setup/teardown

Layer 3: Base Test Utilities
├─ Common helper methods
├─ Wait strategies
├─ Element interaction utilities
└─ Cookie management

Layer 4: WebDriver
├─ Browser automation
├─ Element location
├─ Action execution
└─ Page navigation

Layer 5: Browser
├─ Renders web pages
├─ Executes JavaScript
├─ Handles user interactions
└─ Returns DOM elements
```

## Test Coverage Map

```
Application Areas Tested:

1. Frontend Pages
   ├─ Homepage (/)
   ├─ Auth Page (/auth)
   ├─ Student Dashboard (/dashboard/student)
   ├─ Teacher Dashboard (/dashboard/teacher)
   ├─ Exam Creation (/dashboard/teacher/create-exam)
   └─ Question Bank (/dashboard/teacher/questions)

2. Authentication Flow
   ├─ Student Registration
   ├─ Teacher Registration
   └─ Login Process

3. Authorization
   ├─ Protected Route Access
   ├─ Role-based Navigation
   └─ Redirect Behavior

4. API Endpoints
   └─ Health Check (/api/health)

5. Security
   ├─ Unauthorized Access Prevention
   ├─ Cookie Management
   └─ Session Handling

6. Performance
   ├─ Page Load Times
   └─ Response Times
```

## Error Handling Flow

```
Test Execution
      │
      ├─► Try Test Actions
      │     │
      │     ├─ Success → Continue
      │     │
      │     └─ Exception
      │           │
      │           ├─► TimeoutException
      │           │     └─ Log: "Element not found"
      │           │
      │           ├─► NoSuchElementException
      │           │     └─ Log: "Element doesn't exist"
      │           │
      │           ├─► StaleElementException
      │           │     └─ Log: "Element is stale"
      │           │
      │           └─► General Exception
      │                 └─ Log: Error details
      │
      └─► Test Result
            │
            ├─ Pass → ✓ Print success message
            └─ Fail → ✗ Print error details + stack trace
```

## Continuous Integration Flow (Future)

```
Developer Push Code
      │
      ├─► GitHub Trigger
      │
      ├─► CI/CD Pipeline Starts
      │     │
      │     ├─► Setup Environment
      │     │     ├─ Install Node.js
      │     │     ├─ Install Python
      │     │     └─ Install Chrome
      │     │
      │     ├─► Install Dependencies
      │     │     ├─ npm install
      │     │     └─ pip install
      │     │
      │     ├─► Start Application
      │     │     └─ npm run dev
      │     │
      │     ├─► Run Tests
      │     │     └─ python selenium_test_runner.py
      │     │
      │     └─► Generate Report
      │           ├─ Test Results
      │           ├─ Coverage Report
      │           └─ Failure Logs
      │
      └─► Notify Developer
            ├─ Success → ✓ Deploy
            └─ Failure → ✗ Review Logs
```

## Visualization Legend

```
┌────────┐
│  Box   │  = Component or Process
└────────┘

   │       = Flow direction
   ▼       = Downward flow
   ►       = Rightward flow

├─►        = Branch
└─►        = Final branch

◄────►     = Bidirectional relationship

✓          = Success/Pass
✗          = Failure/Error
```

---

**Note:** This diagram provides a visual representation of the test suite architecture, 
data flow, and execution process. Use it as a reference to understand how different 
components interact and how tests are executed.
