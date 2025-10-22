"""
Test 2: Authentication Page Test
Verifies that the authentication page displays correctly
"""

import time
from base_test_setup import BaseSeleniumTest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TestAuthPage(BaseSeleniumTest):
    """Test 2: Verify the authentication page displays correctly"""

    def test_auth_page_displays(self):
        """Test authentication page loading"""
        self.driver.get(f"{self.base_url}/auth")
        
        # Wait for body to load
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Verify we're on auth page
        assert "/auth" in self.driver.current_url
        
        # Check for auth form elements
        page_source = self.driver.page_source
        
        # Should have login/register forms
        has_auth_elements = (
            "email" in page_source.lower() and 
            "password" in page_source.lower()
        )
        
        assert has_auth_elements, "Auth page should have email/password fields"
        
        print("[OK] Authentication page displayed")
        print(f"    URL: {self.driver.current_url}")
        print("    Auth forms detected")
