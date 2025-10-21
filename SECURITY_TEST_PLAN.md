# 🔒 Security Testing Plan - localStorage Removal

## Test Date: October 21, 2025
## Objective: Verify that sensitive data is no longer stored in localStorage

---

## ✅ Pre-Test Checklist

- [ ] Development server is running (`npm run dev`)
- [ ] Database is connected and seeded
- [ ] Browser DevTools open (F12)
- [ ] Application tab visible in DevTools to inspect localStorage

---

## 🧪 Test Scenarios

### 1. Teacher Flow - Exam Creation

**Steps:**
1. Login as a teacher account
2. Navigate to "Create Exam" page (`/dashboard/teacher/create-exam`)
3. Fill in exam details:
   - Title: "Security Test Exam"
   - Description: "Testing localStorage security"
   - Duration: 30 minutes
   - Select at least 3 questions
4. Click "Create Exam"

**Expected Results:**
- ✅ Exam is created successfully
- ✅ Redirected to exam detail page
- ✅ Check localStorage in DevTools:
  - **SHOULD NOT contain** `correctAnswer` fields
  - **SHOULD NOT contain** complete exam data with answers
  - May contain draft metadata (status, title) - this is OK

**Verification Commands in Browser Console:**
```javascript
// Check localStorage
console.log('LocalStorage keys:', Object.keys(localStorage));
console.log('Exam store:', localStorage.getItem('ops_exams_v1'));

// Should see minimal data, NO correct answers
```

---

### 2. Student Flow - Exam Start & Taking

**Steps:**
1. Logout and login as a student account
2. Navigate to student dashboard (`/dashboard/student`)
3. Find an available exam
4. Click to start the exam
5. Answer some questions (don't submit yet)
6. Open DevTools → Application → Local Storage

**Expected Results:**
- ✅ Exam questions are displayed
- ✅ Can navigate between questions
- ✅ Check localStorage in DevTools:
  - **SHOULD NOT contain** any exam questions
  - **SHOULD NOT contain** correct answers
  - **SHOULD NOT contain** exam data at all
- ✅ All exam data fetched from API

**Verification Commands in Browser Console:**
```javascript
// Check localStorage
console.log('LocalStorage keys:', Object.keys(localStorage));
localStorage.getItem('ops_exams_v1'); // Should be null or no sensitive data

// Check network tab - should see API calls
// GET /api/exams/[id] - fetching exam data from server
```

---

### 3. Exam Submission Flow

**Steps:**
1. Continue from previous test (student taking exam)
2. Answer all questions
3. Click "Submit Exam"
4. Confirm submission

**Expected Results:**
- ✅ Exam submits successfully
- ✅ Score is calculated and displayed
- ✅ Check localStorage:
  - **SHOULD NOT contain** exam results
  - **SHOULD NOT contain** score or percentage
- ✅ Check Network tab:
  - Should see `POST /api/attempts/[id]/submit`
  - Response contains score calculated server-side

**Verification Commands in Browser Console:**
```javascript
// Check localStorage for results
console.log('Results store:', localStorage.getItem('ops_exam_results_v1'));
// Should be null or empty

// All results should be in database only
```

---

### 4. Teacher - View Submissions

**Steps:**
1. Logout and login as teacher
2. Navigate to the exam you created
3. Click "Submissions" or "View Results"
4. Check the submissions list

**Expected Results:**
- ✅ Submissions are displayed
- ✅ Scores and percentages shown
- ✅ Check localStorage:
  - **SHOULD NOT contain** student results
- ✅ Check Network tab:
  - Should see `GET /api/exams/[id]/submissions`
  - Data fetched from server, not localStorage

**Verification:**
```javascript
// Submissions should come from API
console.log('No results in localStorage:', localStorage.getItem('ops_exam_results_v1'));
```

---

### 5. Security Verification - Browser Inspection

**Steps:**
1. While logged in as student with an active exam
2. Open DevTools → Console
3. Try to access exam data manually

**Tests:**
```javascript
// Try to find correct answers in localStorage
console.log('All localStorage:', { ...localStorage });

// Search for "correctAnswer" string
JSON.stringify(localStorage).includes('correctAnswer'); 
// Should return FALSE

// Search for "answer" (might catch it)
JSON.stringify(localStorage).includes('answer'); 
// Should return FALSE or very limited results

// Check what's actually stored
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});
```

**Expected Results:**
- ✅ No `correctAnswer` fields found
- ✅ No exam questions with answers
- ✅ No student results/scores

---

### 6. Deprecation Warnings Check

**Steps:**
1. Open browser console while using the application
2. Look for console warnings

**Expected Results:**
- ✅ Should see warnings like:
  - `DEPRECATED: getResultsByExam - Use API endpoint instead`
  - `DEPRECATED: upsertResult - Use API endpoint instead`
- ✅ These warnings indicate old code paths are still present but marked

---

### 7. Network Security Check

**Steps:**
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Perform exam creation, taking, and submission
4. Inspect API calls

**Expected API Calls:**
- ✅ `POST /api/exams` - Create exam
- ✅ `GET /api/exams/[id]` - Fetch exam (without answers for students)
- ✅ `GET /api/exams/[id]/start` - Start exam session
- ✅ `POST /api/attempts/[id]/submit` - Submit answers
- ✅ `GET /api/exams/[id]/submissions` - View submissions (teacher only)

**Verify Response Data:**
- For students: Exam questions should NOT include `correctAnswer` field
- For teachers: Full exam data including correct answers
- Submissions: All scores calculated server-side

---

## 🚨 Red Flags to Watch For

### ❌ FAIL if any of these are found:

1. **localStorage contains `correctAnswer` fields**
   - Students can cheat by inspecting browser storage
   
2. **localStorage contains complete exam data**
   - Exam integrity compromised
   
3. **localStorage contains exam results/scores**
   - Results can be manipulated client-side
   
4. **No API calls for exam data**
   - Means data is still coming from localStorage

5. **Students can see answers in Network responses**
   - Check that GET /api/exams/[id] doesn't send correct answers to students

---

## 📊 Test Results Log

### Test Run #1: [Date/Time]

| Test Case | Status | Notes |
|-----------|--------|-------|
| Teacher Exam Creation | ⬜ | |
| Student Exam Start | ⬜ | |
| Exam Submission | ⬜ | |
| Teacher View Submissions | ⬜ | |
| localStorage Security Check | ⬜ | |
| Deprecation Warnings | ⬜ | |
| Network API Calls | ⬜ | |

**Overall Status:** ⬜ PASS / ⬜ FAIL

**Issues Found:**
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]

**Screenshots:**
- [ ] localStorage view (should be empty/minimal)
- [ ] Network tab showing API calls
- [ ] Console warnings

---

## 🔧 Troubleshooting

### If localStorage still contains sensitive data:

1. **Clear localStorage manually:**
   ```javascript
   localStorage.clear();
   ```

2. **Check which component is writing to localStorage:**
   - Search codebase for `localStorage.setItem`
   - Verify it's not storing sensitive data

3. **Verify API endpoints are working:**
   - Check backend logs
   - Ensure database connections are active

### If deprecation warnings appear:

✅ **This is expected!** Warnings indicate old code paths are marked but not yet removed.

To fix permanently (future work):
- Remove deprecated functions from `examStore.ts`
- Remove references in `useExamStore.ts`

---

## ✅ Success Criteria

**Test PASSES if:**
- ✅ No `correctAnswer` in localStorage
- ✅ No complete exam data in localStorage
- ✅ No exam results in localStorage
- ✅ All data fetched via API
- ✅ Server-side validation working
- ✅ Students cannot access answers via browser tools

**Test FAILS if:**
- ❌ Any sensitive data found in localStorage
- ❌ Students can see answers
- ❌ Results can be manipulated client-side
- ❌ API calls not happening

---

## 📝 Post-Test Actions

After successful testing:
- [ ] Document any remaining issues
- [ ] Update this test plan with findings
- [ ] Plan removal of deprecated localStorage functions
- [ ] Consider adding automated E2E tests
- [ ] Security audit complete ✅

---

## 🎯 Next Steps (After Testing)

1. **Remove deprecated functions** (when confident):
   - Delete `getResultsByExam` from examStore.ts
   - Delete `upsertResult` from examStore.ts
   - Remove localStorage result storage entirely

2. **Add API documentation**:
   - Document which endpoints replace localStorage
   - Create migration guide for developers

3. **Add automated tests**:
   - E2E tests for exam flow
   - Security tests to prevent localStorage usage
   - API integration tests

4. **Performance optimization**:
   - Add caching strategy for API calls
   - Implement proper loading states
   - Add offline support (if needed, with secure caching)

---

## 📚 Related Documentation

- `SECURITY_IMPROVEMENTS.md` - Details of changes made
- `app/lib/examStore.ts` - localStorage store (deprecated)
- `app/lib/api/client.ts` - API client implementation

---

**Test Conducted By:** [Your Name]
**Date:** [Test Date]
**Result:** ⬜ PASS / ⬜ FAIL
