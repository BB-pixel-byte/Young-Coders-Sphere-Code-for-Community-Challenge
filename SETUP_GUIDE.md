# ChoreMap iOS App - Complete Setup & Installation Guide

## System Requirements

### Minimum Requirements
- **macOS:** 12.0 or later
- **Xcode:** 15.0 or later
- **iOS:** 15.0 or later (for app)
- **iPhone:** XS or later (ARKit support required)
- **Swift:** 5.9+
- **Python:** 3.8+ (for backend)
- **Node.js:** 18+ (for frontend)

### Recommended Hardware
- MacBook Pro M1/M2/M3 (for faster builds)
- iPhone 14 Pro+ (for LiDAR scanner support)
- 16GB+ RAM for development

## Installation Steps

### Step 1: Verify Xcode Installation

```bash
# Check Xcode version
xcode-select --version

# Install/update Xcode Command Line Tools if needed
xcode-select --install

# Set Xcode path (if not already set)
sudo xcode-select --reset
```

### Step 2: Clone/Access Project

```bash
cd ~/path/to/Young-Coders-Sphere-Code-for-Community-Challenge
ls ios/
# Should show: ChoreMap.swift, Info.plist, Package.swift, etc.
```

### Step 3: Open Project in Xcode

**Option A: Command Line**
```bash
open -a Xcode ios/
```

**Option B: GUI**
1. Open Xcode
2. File → Open
3. Navigate to `ios/` folder
4. Select folder or workspace

### Step 4: Configure Build Settings

1. Select the **ChoreMap** target
2. Go to **Build Settings** tab
3. Search for and verify:
   - `iOS Deployment Target`: 15.0
   - `Swift Language Version`: 5.9
   - `Bundle Identifier`: com.yourname.choremap
   - `Code Signing Identity`: Apple Development (or your team)

### Step 5: Code Signing

**For Simulator (No signing needed):**
- Xcode handles automatically

**For Physical Device:**
1. Connect iPhone to Mac via USB
2. Select device in Xcode top bar
3. Go to Signing & Capabilities
4. Check "Automatically manage signing"
5. Select your Apple Team

### Step 6: Verify Permissions

Ensure `Info.plist` is in project:
- Files should include:
  - `ChoreMap.swift`
  - `Info.plist`
  - `ChoreMapNetworking.swift`
  - `AR_IMPLEMENTATION.md`

## Backend Setup

### Terminal 1: Start Backend Server

```bash
cd backend

# Install dependencies if needed
pip install fastapi uvicorn python-dotenv google-genai

# Start server
python -m uvicorn main:app --reload --port 8000

# Expected output:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
```

**Verification:**
```bash
# In another terminal, test endpoint
curl http://localhost:8000/users/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"123","role":"senior"}'

# Should return user_id
```

### Terminal 2: Start Frontend Server (Optional)

```bash
cd frontend

npm install
npm run dev

# Should output:
# ➜  Local:   http://localhost:5173/
```

## iOS App Deployment

### Build for Simulator

1. Select **iPhone 15** (or latest) from device dropdown
2. Press **⌘ + B** to build
3. Press **⌘ + R** to run

**Troubleshooting:**
```bash
# Clear build cache if issues
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean build
⌘ + Shift + K (Product → Clean Build Folder)
```

### Build for Physical Device

1. Connect iPhone via USB
2. Select device from dropdown (not "Any iOS Device")
3. Ensure device is unlocked
4. Press **⌘ + R** to run
5. On first run, you may need to trust developer app:
   - Settings → General → VPN & Device Management
   - Trust your Apple ID

### Network Configuration

**For Local Development (Device to Localhost):**

1. Find your Mac's IP:
```bash
# Get local IP
ipconfig getifaddr en0
# Example: 192.168.1.100
```

2. Update iOS app to connect to your Mac:
   - Edit `ChoreMapNetworking.swift`
   - Change: `let apiBase = "http://192.168.1.100:8000"`
   - Build and run

3. Ensure devices on same WiFi network

**Alternative: Use ngrok for Tunneling**
```bash
brew install ngrok

# Tunnel backend
ngrok http 8000

# Copy forwarding URL (e.g., https://abc123.ngrok.io)
# Update iOS app to use this URL
```

## Verification Checklist

### Backend Verification
- [ ] FastAPI running on port 8000
- [ ] Database initialized with test data
- [ ] CORS headers configured
- [ ] All routes responding

### iOS App Verification

**Authentication Flow:**
- [ ] Launch app
- [ ] Register new account
- [ ] Verify successful registration
- [ ] Login with new account
- [ ] Navigate to dashboard

**Senior Features:**
- [ ] Create chore request
- [ ] Upload image
- [ ] View posted chores
- [ ] See chore status updates

**AR Features (Device Only):**
- [ ] Grant camera permission
- [ ] Launch AR Scanner
- [ ] Verify planes detected (green/blue visualization)
- [ ] Capture AR screenshot
- [ ] Image appears in form

**Volunteer Features:**
- [ ] Logout as Senior
- [ ] Login as Volunteer
- [ ] View available chores
- [ ] Claim a chore
- [ ] View leaderboard
- [ ] View rewards

**Networking:**
- [ ] All API calls succeed
- [ ] Data displays correctly
- [ ] Images upload properly
- [ ] Real-time updates work

## Testing Workflows

### Test 1: Full Registration Flow

```swift
// In iOS app:
1. Tap "Create Account"
2. Fill in:
   - Name: "Test Senior"
   - Email: "senior@example.com"
   - Password: "Password123"
   - Role: Senior
3. Tap "Create Account"
4. Verify dashboard appears
5. Verify name shows "Test Senior"
```

### Test 2: Create Chore with AR

```swift
// In iOS app (Senior):
1. Navigate to "Post Request" tab
2. Fill details:
   - Title: "Fix kitchen sink"
   - Description: "Draining slowly"
   - Location: "Kitchen"
3. Tap "Scan Area"
4. Point camera around sink area
5. Wait for plane detection (green/blue planes appear)
6. Tap "Capture"
7. Verify image in preview
8. Tap "Post Chore Request"
9. Verify success message
```

### Test 3: Claim Chore as Volunteer

```swift
// In iOS app (Volunteer):
1. Login as volunteer
2. View "Available" tab
3. See chore "Fix kitchen sink"
4. Tap "Claim Chore"
5. Verify chore removed from list
6. Check leaderboard for updated points
```

### Test 4: Network Connectivity

**Test API Connection:**
```bash
# From iOS device terminal simulator:
ping 192.168.1.100

# Test API endpoint
curl http://192.168.1.100:8000/chores/all

# Should return JSON array of chores
```

## Debugging

### Enable Console Logging

**In Xcode:**
1. View → Debug Area → Show Console (⌘ + Shift + C)
2. Filter by "ChoreMap" to see app logs

**Common Issues:**

**Issue: "Unable to connect to server"**
```
Solution:
1. Verify backend running: curl localhost:8000
2. Check device on same WiFi
3. Update API URL in ChoreMapNetworking.swift
4. Rebuild app
```

**Issue: "Camera permission denied"**
```
Solution:
1. Settings → ChoreMap → Camera: Allow
2. Restart app
3. Try AR scan again
```

**Issue: "AR not working"**
```
Solution:
1. Requires actual iPhone (XS or later)
2. Not available in simulator
3. Ensure good lighting
4. Wait 5-10 seconds for initialization
```

**Issue: "Compile errors"**
```
Solution:
1. Clean build: ⌘ + Shift + K
2. Delete derived data:
   rm -rf ~/Library/Developer/Xcode/DerivedData
3. Close Xcode
4. Reopen project
5. Build again: ⌘ + B
```

## Performance Tuning

### Optimize Image Size
```swift
// In ChoreMapNetworking.swift
// Change JPEG quality for smaller file size
if let imageData = image.jpegData(compressionQuality: 0.6) {
    // Lower quality = smaller file = faster upload
}
```

### Network Timeout Adjustment
```swift
// Increase timeout for slow connections
let config = URLSessionConfiguration.default
config.timeoutIntervalForRequest = 60  // Default: 30
config.timeoutIntervalForResource = 300  // Default: 60
```

## Deployment to App Store (Production)

### Prerequisites
- Apple Developer Account ($99/year)
- Certificates and Provisioning Profiles
- App Review compliance

### Steps
1. Update version number in Info.plist
2. Archive app: Product → Archive
3. Distribute to App Store Connect
4. Submit for review
5. Wait for approval (24-48 hours typical)

**Note:** For development/testing, use TestFlight:
1. Archive app
2. Upload to TestFlight
3. Share with testers via invite link
4. Testers install from TestFlight app

## File Structure

```
ios/
├── ChoreMap.swift                  # Main app (views & models)
├── ChoreMapNetworking.swift        # API layer
├── Info.plist                      # App configuration
├── Package.swift                   # Swift Package config
├── README.md                       # Main documentation
├── AR_IMPLEMENTATION.md            # AR technical details
└── SETUP_GUIDE.md                  # This file
```

## Support & Troubleshooting

### Quick Fixes
1. **App won't launch:** Clean build & restart
2. **Network errors:** Check backend running
3. **AR not working:** Use actual device
4. **Compile errors:** Delete DerivedData

### Debug Info
- Xcode console: ⌘ + Shift + C
- Device console: Window → Devices and Simulators
- Network log: Xcode Network instrument (Cmd + I)

### Get Help
1. Check error messages in console
2. Review documentation files
3. Check backend logs
4. Verify network connectivity
5. Test with fresh build

## Next Steps After Installation

1. ✅ Verify all 3 components running:
   - Backend on :8000
   - Frontend on :5173 (optional)
   - iOS app on device/simulator

2. ✅ Test authentication flow

3. ✅ Test core features:
   - Create chore
   - Upload/scan images
   - Claim chores
   - View rewards

4. ✅ Deploy to devices/testers

5. ✅ Monitor logs and fix issues

6. ✅ Iterate on UX based on feedback

## Production Checklist

- [ ] Update API base URL to production server
- [ ] Enable HTTPS only
- [ ] Implement error handling/retry logic
- [ ] Add analytics tracking
- [ ] Set up crash reporting (Sentry, Firebase)
- [ ] Implement in-app updates
- [ ] Set up push notifications
- [ ] Test on multiple device types
- [ ] Optimize for network edge cases
- [ ] Prepare for App Store submission

## Contact & Support

For issues or questions:
1. Check console output
2. Review relevant documentation file
3. Verify backend is running
4. Test network connectivity
5. Rebuild from clean state

---

**Last Updated:** July 2, 2026
**App Version:** 1.0
**iOS Minimum:** 15.0
**Swift:** 5.9+
