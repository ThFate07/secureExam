"""
selenium_test_runner.py
Runs the Selenium Test Suite for SecureExam Proctoring System
"""

import sys
import os
import threading
import time
import unittest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# Import test cases
from selenium_test_cases import ProctoringSystemSeleniumTests


class SeleniumTestRunner(ProctoringSystemSeleniumTests):
    """Test Runner with setup and teardown for Selenium + Next.js"""

    @classmethod
    def setUpClass(cls):
        print("=" * 80)
        print("SecureExam Proctoring System - Selenium Test Runner")
        print("=" * 80)

        # Next.js app configuration
        cls.base_url = "http://localhost:3000"
        cls.app_ready = False

        # Start Next.js development server
        print("\nStarting Next.js development server...")
        print("Please ensure the Next.js app is running on port 3000")
        print("Run: npm run dev")
        
        # Wait for server to be ready
        print("Waiting for server to start...")
        time.sleep(5)

        # Setup Chrome WebDriver
        chrome_options = Options()
        # chrome_options.add_argument("--headless")  # COMMENTED OUT - Browser will be visible
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        print("🔍 Running in VISIBLE mode - Browser window will appear")

        try:
            service = Service(ChromeDriverManager().install())
            cls.driver = webdriver.Chrome(service=service, options=chrome_options)
            cls.driver.implicitly_wait(10)
            cls.selenium_available = True
            print("✅ Chrome WebDriver initialized")
        except Exception as e:
            print(f"❌ WebDriver setup failed: {e}")
            cls.driver = None
            cls.selenium_available = False

        # Setup test data
        cls.setup_test_data()

    @classmethod
    def setup_test_data(cls):
        """Define test user credentials for testing"""
        cls.test_users = {
            "teacher": {
                "name": "Test Teacher",
                "email": "teacher@test.com",
                "password": "TestPass123!",
                "role": "teacher"
            },
            "student": {
                "name": "Test Student",
                "email": "student@test.com",
                "password": "TestPass123!",
                "role": "student"
            }
        }
        
        cls.test_exam = {
            "title": "Test Exam - Selenium",
            "description": "This is a test exam created by Selenium automation",
            "duration": 60,
            "totalMarks": 100
        }
        
        print("\n✅ Test data configured")

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "driver") and cls.driver:
            cls.driver.quit()
        print("\n" + "=" * 80)
        print("Test suite completed")
        print("=" * 80)


def run_tests():
    """Run all test cases"""
    suite = unittest.TestLoader().loadTestsFromTestCase(SeleniumTestRunner)
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    print("\n" + "=" * 80)
    print("Running Selenium Tests...")
    print("=" * 80)
    result = runner.run(suite)
    
    print("\n" + "=" * 80)
    print("Test Summary:")
    print("=" * 80)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success Rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.2f}%")
    
    return result.wasSuccessful()


if __name__ == "__main__":
    try:
        ok = run_tests()
        sys.exit(0 if ok else 1)
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
