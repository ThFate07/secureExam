"""
Test 1: Homepage Load Test
Verifies that the SecureExam homepage loads successfully
"""

from base_test_setup import BaseSeleniumTest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TestHomepageLoad(BaseSeleniumTest):
    """Test 1: Verify that the homepage loads successfully"""

    def test_homepage_loads(self):
        """Test homepage loading and basic elements"""
        self.driver.get(f"{self.base_url}/")
        
        # Wait for body to be present
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Verify page content
        page_source = self.driver.page_source
        assert "SecureExam" in page_source or "proctoring" in page_source.lower()
        
        # Verify key elements exist
        assert self.driver.find_element(By.TAG_NAME, "body")
        
        print("[OK] Homepage loaded successfully")
        print(f"    Title: {self.driver.title}")
        print(f"    URL: {self.driver.current_url}")
