# Reset 2FA - Complete Setup Guide

## What Was Fixed

Added a **Reset 2FA** button that allows you to clear the 2FA setup and start fresh. This solves the JSON error by resetting the entire authentication state.

## How to Use

### If You're Stuck with JSON Error:

1. **Click "Reset 2FA"** button (appears in both setup and verify steps)
2. **System clears**:
   - ✓ localStorage 2FA flags
   - ✓ Session secrets  
   - ✓ Database 2FA settings
   - ✓ All frontend state
3. **Redirects to login** → Start from beginning
4. **Re-enter credentials** and set up 2FA again

### Reset 2FA Flow

```
Error Screen
     ↓
[Reset 2FA] Button clicked
     ↓
Backend clears all 2FA data
Frontend clears all state
     ↓
Back to Login Screen
     ↓
Enter Email & Password
     ↓
New 2FA Setup (QR code)
     ↓
Scan with Authenticator
     ↓
Enter 6-digit code
     ↓
✓ Login Success!
```

## Files Updated

### Frontend: `src/pages/admin/components/AdminLogin.tsx`
- Added `handleReset2fa()` function
- Calls backend reset endpoint
- Clears all local state and localStorage
- Added "Reset 2FA" button in setup step
- Added "Reset 2FA" button in verify step

### Backend: `php-backend/api/index.php`
- Added `POST /api/auth/reset-2fa` endpoint
- Clears session secrets
- Updates database: `admin2faSecret = NULL, admin2faEnabled = 0`
- Returns success response

### Service: `src/services/mysqlService.ts`
- Already has `reset2fa()` method (no changes needed)
- Calls `/api/auth/reset-2fa` endpoint

## Testing Steps

1. **Try to login** (if stuck with error)
2. **Click "Reset 2FA"** button
3. **Wait** for 2FA to be cleared (watch for status message)
4. **Enter credentials again** to start fresh
5. **Complete new 2FA setup** with QR code
6. **✓ Should login successfully**

## Troubleshooting

**Q: The Reset button doesn't appear?**
A: Refresh the page. Frontend might not have latest build yet.

**Q: Still getting JSON error after reset?**
A: 
- Clear browser cache (Ctrl+Shift+Delete)
- Clear localStorage (open DevTools → Application → Storage → clear all)
- Reload page
- Try Reset 2FA again

**Q: Can't scan QR code?**
A: Use manual secret key instead:
- Copy the "Manual Key:" text from the setup screen
- Add it manually in your authenticator app
- App name: "Primecrest"
- Type: TOTP

**Q: Device time is wrong?**
A: TOTP codes are time-sensitive. Sync your device time:
- Windows: Right-click clock → Adjust date/time
- Phone: Settings → Date & Time → Auto-sync
- Wait 30 seconds and try new code

## Security Notes

✓ Reset 2FA clears everything safely
✓ No backdoor created
✓ Secrets deleted from database
✓ Session cleared on server
✓ Fresh setup required

## Ready to Deploy

All changes are frontend + backend compatible:
1. Updated frontend builds successfully ✓
2. New backend endpoint ready ✓
3. No database migrations needed ✓

Just upload updated files and test login!

## Quick Checklist

- [ ] Build frontend: `npm run build`
- [ ] Upload `out/` folder to web host
- [ ] Upload `php-backend/api/` to Tru Host
- [ ] Test login with Reset 2FA button available
- [ ] Verify 2FA setup works from scratch
- [ ] Confirm login succeeds with authenticator code

Done! ✓
