# 🚀 Quick Start - Real-Time Monitoring

## ✅ What Was Fixed

1. **Event subscription order** - Teachers now subscribe BEFORE joining
2. **Socket initialization** - Events queue if socket not ready
3. **Server configuration** - Fixed TypeScript compilation
4. **Comprehensive logging** - Easy debugging throughout

## 🏃 Quick Test (5 minutes)

### Step 1: Start Server
```powershell
npm run dev
```
Wait for: `> Server ready on http://localhost:3000`

### Step 2: Open Teacher Dashboard
1. Browser → `http://localhost:3000`
2. Login as **teacher**
3. Navigate to `/dashboard/teacher/monitor`
4. Look for **"Connected"** (green) in top-right

### Step 3: Open Student Exam
1. **New incognito window** → `http://localhost:3000`
2. Login as **student**
3. Start/open any exam
4. Watch the magic happen! ✨

### Step 4: Verify
**In Teacher Dashboard:**
- Student appears within 5 seconds
- "Last active" updates every ~5 seconds
- Student count increases

**Press F12 in both windows to see detailed logs**

## 🔍 Debugging

### Check Connection Status
**Teacher Dashboard:** Top-right shows "Connected" (green) or "Disconnected" (red)

### View Console Logs
Press **F12** in browser, then:
- Look for `[Monitor]` logs (teacher side)
- Look for `[Exam]` logs (student side)
- Look for `[WebSocket]` logs (both sides)

### Server Logs
Check terminal running `npm run dev`:
- Look for `[Server]` logs
- Connection events
- Event forwarding logs

## 📋 Common Issues

| Issue | Quick Fix |
|-------|-----------|
| "Disconnected" status | Check server is running (`npm run dev`) |
| No students showing | Open student exam page, check F12 console |
| Port 3000 in use | Kill process or change port |
| Events not updating | Check both browser consoles for errors |

## 🎯 Success Indicators

✅ Teacher dashboard shows "Connected" (green WiFi icon)
✅ Students appear in list within 5 seconds
✅ "Last active" timestamp updates regularly
✅ Question changes reflect immediately
✅ Student count matches actual students

## 📚 Documentation

- **Full Implementation:** `WEBSOCKET_IMPLEMENTATION.md`
- **Testing Guide:** `WEBSOCKET_TESTING_GUIDE.md`
- **Fix Summary:** `WEBSOCKET_FIX_SUMMARY.md`

## 🆘 Need Help?

1. Check browser console (F12) for error messages
2. Check server terminal for connection logs
3. Review `WEBSOCKET_TESTING_GUIDE.md` for detailed troubleshooting
4. Ensure both teacher and student use same server instance

---

**Server Running?** Check terminal for `> Server ready on http://localhost:3000`

**Still Issues?** Check the detailed guides in the documentation files above.
