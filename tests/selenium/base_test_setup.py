"""
base_test_setup.py
Base setup for all Selenium tests
"""

import unittest
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


class BaseSeleniumTest(unittest.TestCase):
    """Base test class with common utilities"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test class - driver is initialized by runner"""
        cls.base_url = "http://localhost:3000"
    
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
            messages = self.driver.find_elements_by_css_selector("[role='alert'], .alert, .toast")
            return [msg.text for msg in messages if msg.text.strip()]
        except:
            return []
    
    def clear_cookies(self):
        """Clear browser cookies"""
        self.driver.delete_all_cookies()
