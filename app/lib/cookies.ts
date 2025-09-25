// Cookie management utilities
export interface CookieData {
  isLoggedIn: boolean;
  userType: 'student' | 'teacher' | null;
  userId: string | null;
  userName: string | null;
  email: string | null;
}

// Set cookie with expiration
export function setCookie(name: string, value: string, days: number = 7): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
}

// Get cookie value
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Delete cookie
export function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Get all authentication-related cookies as an object
export function getCookies(): CookieData {
  return {
    isLoggedIn: getCookie('isLoggedIn') === 'true',
    userType: getCookie('userType') as 'student' | 'teacher' | null,
    userId: getCookie('userId'),
    userName: getCookie('userName'),
    email: getCookie('email'),
  };
}

// Set authentication cookies
export function setAuthCookies(userData: {
  userId: string;
  userName: string;
  email: string;
  userType: 'student' | 'teacher';
}): void {
  setCookie('isLoggedIn', 'true');
  setCookie('userType', userData.userType);
  setCookie('userId', userData.userId);
  setCookie('userName', userData.userName);
  setCookie('email', userData.email);
}

// Clear all authentication cookies
export function clearAuthCookies(): void {
  deleteCookie('isLoggedIn');
  deleteCookie('userType');
  deleteCookie('userId');
  deleteCookie('userName');
  deleteCookie('email');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCookie('isLoggedIn') === 'true';
}

// Get current user type
export function getUserType(): 'student' | 'teacher' | null {
  return getCookie('userType') as 'student' | 'teacher' | null;
}

// Get current user info
export function getCurrentUser(): {
  id: string | null;
  name: string | null;
  email: string | null;
  type: 'student' | 'teacher' | null;
} {
  return {
    id: getCookie('userId'),
    name: getCookie('userName'),
    email: getCookie('email'),
    type: getCookie('userType') as 'student' | 'teacher' | null,
  };
}