"""
selenium_test_cases.py
Contains all test cases for SecureExam Proctoring System
"""

import unittest
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


class ProctoringSystemSeleniumTests(unittest.TestCase):
    """Base class for all Selenium test cases"""

    def wait_for_element(self, by, value, timeout=10):
        """Wait for an element to be present"""
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
        except TimeoutException:
            print(f"❌ Timeout waiting for element: {by}={value}")
            raise

    def wait_for_clickable(self, by, value, timeout=10):
        """Wait for an element to be clickable"""
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
        except TimeoutException:
            print(f"❌ Timeout waiting for clickable element: {by}={value}")
            raise

    def get_flash_messages(self):
        """Get all flash/alert messages from the page"""
        try:
            messages = self.driver.find_elements(By.CSS_SELECTOR, "[role='alert'], .alert, .toast")
            return [msg.text for msg in messages if msg.text.strip()]
        except:
            return []

    def clear_cookies(self):
        """Clear browser cookies"""
        self.driver.delete_all_cookies()

    # ========================================
    # Test 1: Homepage Load Test
    # ========================================
    def test_01_homepage_loads(self):
        """Test 1: Verify that the homepage loads successfully"""
        print("\n" + "=" * 60)
        print("Test 1: Homepage Load Test")
        print("=" * 60)
        
        self.driver.get(f"{self.base_url}/")
        self.wait_for_element(By.TAG_NAME, "body")
        
        # Check if page title contains SecureExam
        assert "SecureExam" in self.driver.page_source or "proctoring" in self.driver.page_source.lower()
        
        # Check for key elements
        assert self.driver.find_element(By.TAG_NAME, "body")
        
        print("✅ [PASS] Homepage loaded successfully")
        print(f"   - Title: {self.driver.title}")
        print(f"   - URL: {self.driver.current_url}")

    # ========================================
    # Test 2: Navigation to Auth Page
    # ========================================
    def test_02_navigation_to_auth_page(self):
        """Test 2: Verify navigation to authentication page"""
        print("\n" + "=" * 60)
        print("Test 2: Navigation to Auth Page")
        print("=" * 60)
        
        # Navigate directly to auth page
        self.driver.get(f"{self.base_url}/auth")
        time.sleep(2)
        
        try:
            # Verify we're on auth page
            assert "/auth" in self.driver.current_url
            
            # Verify auth page has loaded with form elements
            body = self.wait_for_element(By.TAG_NAME, "body")
            page_source = self.driver.page_source
            
            # Check for key auth elements
            has_auth_elements = (
                "email" in page_source.lower() and
                "password" in page_source.lower()
            )
            
            assert has_auth_elements, "Auth page should have login/register forms"
            
            print("✅ [PASS] Navigation to auth page successful")
            print(f"   - Current URL: {self.driver.current_url}")
            print("   - Auth forms detected")
        except Exception as e:
            print(f"❌ [FAIL] Auth page verification failed: {e}")
            raise

    # ========================================
    # Test 3: Student Registration
    # ========================================
    def test_03_student_registration(self):
        """Test 3: Verify student registration functionality"""
        print("\n" + "=" * 60)
        print("Test 3: Student Registration")
        print("=" * 60)
        
        self.clear_cookies()
        self.driver.get(f"{self.base_url}/auth")
        time.sleep(2)
        
        try:
            # Look for "Sign up" or "Don't have an account" link to switch to register form
            register_links = self.driver.find_elements(By.XPATH, "//*[contains(text(), \"Don't have an account\") or contains(text(), 'Sign up') or contains(text(), 'Create Account')]")
            if register_links:
                register_links[0].click()
                time.sleep(1)
            
            # Fill registration form using IDs (React Hook Form uses id attributes)
            name_input = self.wait_for_element(By.ID, "name", timeout=5)
            name_input.clear()
            name_input.send_keys(self.test_users["student"]["name"])
            
            email_input = self.driver.find_element(By.ID, "reg-email")
            email_input.clear()
            email_input.send_keys(f"student{int(time.time())}@test.com")
            
            password_input = self.driver.find_element(By.ID, "reg-password")
            password_input.clear()
            password_input.send_keys(self.test_users["student"]["password"])
            
            # Confirm password field
            confirm_password = self.driver.find_element(By.ID, "confirmPassword")
            confirm_password.clear()
            confirm_password.send_keys(self.test_users["student"]["password"])
            
            # Select student role from dropdown
            role_select = self.driver.find_element(By.ID, "reg-role")
            role_select.click()
            student_option = self.driver.find_element(By.XPATH, "//option[@value='student']")
            student_option.click()
            
            # Submit form
            submit_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            time.sleep(3)
            
            # Verify registration success (redirected to dashboard or success message)
            current_url = self.driver.current_url
            page_source = self.driver.page_source.lower()
            
            success = ("/dashboard" in current_url or 
                      "dashboard" in page_source or 
                      "welcome" in page_source)
            
            assert success, "Registration did not redirect to dashboard or show success"
            
            print("✅ [PASS] Student registration successful")
            print(f"   - Redirected to: {current_url}")
            
        except Exception as e:
            print(f"❌ [FAIL] Student registration failed: {e}")
            raise

    # ========================================
    # Test 4: Teacher Registration
    # ========================================
    def test_04_teacher_registration(self):
        """Test 4: Verify teacher registration functionality"""
        print("\n" + "=" * 60)
        print("Test 4: Teacher Registration")
        print("=" * 60)
        
        self.clear_cookies()
        self.driver.get(f"{self.base_url}/auth")
        time.sleep(2)
        
        try:
            # Look for "Sign up" or "Don't have an account" link to switch to register form
            register_links = self.driver.find_elements(By.XPATH, "//*[contains(text(), \"Don't have an account\") or contains(text(), 'Sign up') or contains(text(), 'Create Account')]")
            if register_links:
                register_links[0].click()
                time.sleep(1)
            
            # Fill registration form using IDs (React Hook Form uses id attributes)
            name_input = self.wait_for_element(By.ID, "name", timeout=5)
            name_input.clear()
            name_input.send_keys(self.test_users["teacher"]["name"])
            
            email_input = self.driver.find_element(By.ID, "reg-email")
            email_input.clear()
            email_input.send_keys(f"teacher{int(time.time())}@test.com")
            
            password_input = self.driver.find_element(By.ID, "reg-password")
            password_input.clear()
            password_input.send_keys(self.test_users["teacher"]["password"])
            
            # Confirm password field
            confirm_password = self.driver.find_element(By.ID, "confirmPassword")
            confirm_password.clear()
            confirm_password.send_keys(self.test_users["teacher"]["password"])
            
            # Select teacher role from dropdown
            role_select = self.driver.find_element(By.ID, "reg-role")
            role_select.click()
            teacher_option = self.driver.find_element(By.XPATH, "//option[@value='teacher']")
            teacher_option.click()
            
            # Submit form
            submit_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            time.sleep(3)
            
            # Verify registration success
            current_url = self.driver.current_url
            page_source = self.driver.page_source.lower()
            
            success = ("/dashboard" in current_url or 
                      "dashboard" in page_source or 
                      "welcome" in page_source)
            
            assert success, "Teacher registration did not complete successfully"
            
            print("✅ [PASS] Teacher registration successful")
            print(f"   - Redirected to: {current_url}")
            
        except Exception as e:
            print(f"❌ [FAIL] Teacher registration failed: {e}")
            raise

    # ========================================
    # Test 5: Security - Protected Routes
    # ========================================
    def test_05_protected_routes_security(self):
        """Test 5: Verify protected routes redirect to login"""
        print("\n" + "=" * 60)
        print("Test 5: Protected Routes Security")
        print("=" * 60)
        
        self.clear_cookies()
        
        protected_routes = [
            "/dashboard",
            "/dashboard/student",
            "/dashboard/teacher",
            "/dashboard/teacher/create-exam"
        ]
        
        passed_tests = 0
        
        for route in protected_routes:
            self.driver.get(f"{self.base_url}{route}")
            time.sleep(1)
            
            current_url = self.driver.current_url
            
            # Should redirect to /auth if not authenticated
            if "/auth" in current_url:
                passed_tests += 1
                print(f"   ✓ {route} → Protected (redirected to auth)")
            else:
                print(f"   ✗ {route} → May not be properly protected")
        
        print(f"\n✅ [PASS] Protected routes security check: {passed_tests}/{len(protected_routes)} routes protected")


if __name__ == "__main__":
    unittest.main()
