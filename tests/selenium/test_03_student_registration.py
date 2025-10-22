"""
Test 3: Student Registration Test
Verifies that student registration functionality works
"""

import time
from base_test_setup import BaseSeleniumTest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TestStudentRegistration(BaseSeleniumTest):
    """Test 3: Verify student registration functionality"""

    def test_student_registration(self):
        """Test student registration process"""
        self.clear_cookies()
        self.driver.get(f"{self.base_url}/auth")
        time.sleep(2)
        
        try:
            # Look for "Sign up" link to switch to register form
            register_links = self.driver.find_elements(
                By.XPATH, 
                "//*[contains(text(), \"Don't have an account\") or contains(text(), 'Sign up')]"
            )
            if register_links:
                register_links[0].click()
                time.sleep(1)
            
            # Fill registration form using IDs
            name_input = self.wait_for_element(By.ID, "name", timeout=5)
            name_input.clear()
            name_input.send_keys("Test Student")
            
            # Use timestamp to create unique email
            email = f"student{int(time.time())}@test.com"
            email_input = self.driver.find_element(By.ID, "reg-email")
            email_input.clear()
            email_input.send_keys(email)
            
            password_input = self.driver.find_element(By.ID, "reg-password")
            password_input.clear()
            password_input.send_keys("TestPass123!")
            
            # Confirm password
            confirm_password = self.driver.find_element(By.ID, "confirmPassword")
            confirm_password.clear()
            confirm_password.send_keys("TestPass123!")
            
            # Select student role from dropdown
            role_select = self.driver.find_element(By.ID, "reg-role")
            role_select.click()
            student_option = self.driver.find_element(By.XPATH, "//option[@value='student']")
            student_option.click()
            
            # Submit form
            submit_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            time.sleep(3)
            
            # Verify registration success
            current_url = self.driver.current_url
            page_source = self.driver.page_source.lower()
            
            success = (
                "/dashboard" in current_url or 
                "dashboard" in page_source or 
                "welcome" in page_source
            )
            
            assert success, "Registration should redirect to dashboard"
            
            print("[OK] Student registration successful")
            print(f"    Email: {email}")
            print(f"    Redirected to: {current_url}")
            
        except Exception as e:
            print(f"[ERROR] Student registration failed: {e}")
            raise
