# ChoreMap iOS App - Complete Implementation Guide

## Overview
The ChoreMap iOS app is a complete SwiftUI application with ARKit/RealityKit integration for scanning chore areas, capturing video/images, and providing AR visualization. The app communicates with the backend FastAPI server via HTTPS/JSON.

## Architecture

### Core Components

```
ChoreMapApp (Main Entry Point)
├── AuthView (Login/Register)
├── SeniorDashboard
│   ├── SeniorChoreRequestView (with AR Scanner)
│   └── SeniorChoresListView
└── VolunteerDashboard
    ├── AvailableChoresView
    ├── LeaderboardView
    └── RewardsView
```

### Data Flow

```
iOS App (SwiftUI)
    ↓
URLSession (HTTP/JSON)
    ↓
Backend API (FastAPI on port 8000)
    ↓
SQLite Database
```

## Setup Instructions

### Prerequisites
- Xcode 15.0+
- iOS 15.0+
- A device with ARKit support (iPhone XS or later)
- Backend server running on http://localhost:8000

### Step 1: Open Project in Xcode

1. Open Xcode
2. Select "File" → "Open"
3. Navigate to `ios/` directory
4. Select the project or workspace

### Step 2: Configure Build Settings

1. Select the ChoreMap target
2. Go to "Build Settings"
3. Ensure the following are set:
   - iOS Deployment Target: 15.0
   - Swift Language Version: 5.9
   - Code Signing: Automatic (or use your team ID)

### Step 3: Install Dependencies

The app uses only Apple's native frameworks:
- SwiftUI
- ARKit
- RealityKit
- URLSession (for networking)

No third-party package manager is required.

### Step 4: Configure App Permissions

The `Info.plist` file includes all required permissions:
- **Camera Usage**: `NSCameraUsageDescription`
- **Photo Library**: `NSPhotoLibraryUsageDescription`
- **Location**: `NSLocationWhenInUseUsageDescription`
- **Local Network**: `NSLocalNetworkUsageDescription`

### Step 5: Build and Run

1. Select a simulator or connected device
2. Press `Cmd + B` to build
3. Press `Cmd + R` to run

## Feature Implementation Details

### 1. Authentication (AuthView + AuthManager)

**Functionality:**
- User registration with role selection (Senior/Volunteer)
- User login
- Session management via local storage

**API Endpoints:**
- `POST /users/register` - Create new account
- `POST /users/login` - Authenticate user

**Implementation:**
```swift
// AuthManager handles all auth-related network calls
- register(name, email, password, role) async
- login(email, password) async
- logout()
```

### 2. Senior Dashboard

#### 2.1 Chore Request Creation (SeniorChoreRequestView)

**Features:**
- Title, description, location input
- Image upload via photo library
- AR area scanning capability
- AI analysis integration

**API Endpoint:**
- `POST /chores/post` - Submit new chore request

**Implementation:**
```swift
// Image Picker integration
- Use ImagePicker() for photo library selection
- Image stored as base64 for API transmission

// AR Scanner integration
- ARScannerView presents ARViewControllerWrapper
- Captures 3D environment snapshot
- Returns UIImage for submission
```

**Workflow:**
1. User fills in chore details
2. User uploads image or scans area with AR
3. AI analysis runs on backend
4. Results displayed in UI
5. User submits to create chore request

#### 2.2 Senior Chores List (SeniorChoresListView)

**Features:**
- Display all chores posted by senior
- Status badges (open, claimed, completed)
- Quick-view details

**API Endpoint:**
- `GET /chores/all` - Fetch all chores, filtered client-side

### 3. Volunteer Dashboard

#### 3.1 Available Chores (AvailableChoresView)

**Features:**
- Browse open chore requests
- View AI analysis (difficulty, estimated time, safety notes)
- Claim chores for points

**API Endpoints:**
- `GET /chores/all` - Fetch all chores
- `POST /chores/{choreId}/claim` - Claim a chore

**Implementation:**
- Displays chores with status `open`
- Shows AI insights inline
- One-tap claim functionality

#### 3.2 Leaderboard (LeaderboardView)

**Features:**
- Ranked list of volunteers
- Chores completed count
- Points earned display

**API Endpoint:**
- `GET /volunteers/leaderboard` - Fetch ranking data

#### 3.3 Rewards (RewardsView)

**Features:**
- Display available rewards
- Show point requirements
- Highlight redeemable rewards
- One-tap redemption

**API Endpoints:**
- `GET /rewards` - Fetch available rewards
- `POST /rewards/{rewardId}/redeem` - Redeem reward

### 4. AR Scanner (ARScannerView + ARViewControllerWrapper)

**Frameworks:**
- ARKit 6.0+ for environment tracking
- RealityKit 2.0+ for 3D rendering

**Capabilities:**
- Real-time environment scanning
- 3D plane detection (walls, floors, surfaces)
- Object detection for tools and areas
- Video/image capture of AR environment
- Screenshot capability for submission

**Implementation:**
```swift
class ARViewControllerWrapper: UIViewController {
    var arView: ARView!
    
    // Capture current AR view as UIImage
    @objc func captureImage() {
        if let image = arView.snapshot() {
            onImageCapture?(image)
        }
    }
    
    // Close AR experience
    @objc func closeAR() {
        dismiss(animated: true)
    }
}
```

**Workflow:**
1. User taps "Scan Area" button
2. ARScannerView presents AR experience
3. Camera feed shows environment with AR overlays
4. User frames the chore area
5. User taps "Capture" to take screenshot
6. Image returned to chore request form
7. User can proceed with or without AI analysis

### 5. Networking Layer (URLSession)

**Base Configuration:**
- API Base URL: `http://localhost:8000`
- Content-Type: `application/json`
- Encoding: JSON

**Request/Response Handling:**
```swift
// Example: Login Request
let url = URL(string: "\(apiBase)/users/login")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONEncoder().encode(loginPayload)

let (data, _) = try await URLSession.shared.data(for: request)
let response = try JSONDecoder().decode([String: String].self, from: data)
```

**Error Handling:**
- Network errors are caught and logged
- UI shows appropriate error messages
- Automatic retry capability can be added

**Image Transmission:**
```swift
// Images are converted to base64 before sending
if let image = selectedImage {
    if let imageData = image.jpegData(compressionQuality: 0.8) {
        let base64String = imageData.base64EncodedString()
        // Send base64String in JSON payload
    }
}
```

### 6. Data Models

**User Model:**
```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String
    let role: String
    let points: Int?
}
```

**Chore Model:**
```swift
struct Chore: Codable, Identifiable {
    let id: Int
    let title: String
    let description: String
    let location: String
    let status: String
    let aiDifficulty: String?
    let aiEstimatedTime: String?
    let aiSafetyNotes: String?
    let aiSteps: [String]?
    let aiToolsNeeded: [String]?
}
```

**ChoreAnalysis Model:**
```swift
struct ChoreAnalysis: Codable {
    let toolsNeeded: [String]?
    let steps: [String]?
    let skillsNeeded: [String]?
    let difficulty: String?
    let estimatedTime: String?
    let safetyNotes: String?
}
```

## Running the Complete System

### Terminal 1: Backend
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Terminal 2: Frontend (Web)
```bash
cd frontend
npm run dev
```

### Terminal 3: iOS App
- Open Xcode and run on simulator or device
- Ensure device is on same network as backend
- Backend must be accessible at http://localhost:8000 (or appropriate IP)

## Testing Workflow

### 1. Test Authentication
1. Launch app
2. Tap "Create Account"
3. Enter: Name, Email, Password, Select Role (Senior)
4. Verify successful registration
5. Tap "Already have an account?"
6. Login with same credentials
7. Verify dashboard appears

### 2. Test Senior Features
1. Logged in as Senior
2. Navigate to "Post Request" tab
3. Enter chore details
4. Tap "Upload Photo" or "Scan Area"
5. Select/capture image
6. Verify image preview
7. Tap "Post Chore Request"
8. Navigate to "Your Chores" tab
9. Verify chore appears in list

### 3. Test AR Scanner
1. Tap "Scan Area" button
2. Allow camera permission
3. Point camera at desired area
4. Verify AR overlays appear
5. Tap "Capture" button
6. Verify screenshot taken
7. Verify image preview in form

### 4. Test Volunteer Features
1. Logout and login as Volunteer
2. Navigate to "Available" tab
3. Verify chores from senior appear
4. Tap "Claim Chore"
5. Verify chore claimed
6. Navigate to "Leaderboard" tab
7. Verify user appears with points
8. Navigate to "Rewards" tab
9. Verify rewards displayed with point requirements

### 5. Test Points and Rewards
1. Backend should award points on chore completion
2. Verify points updated in dashboard
3. If points >= reward requirement, "Redeem" button active
4. Tap "Redeem" to claim reward

## Troubleshooting

### App Won't Connect to Backend
- Ensure backend is running: `python -m uvicorn main:app --reload --port 8000`
- Check Info.plist has `NSAppTransportSecurity` exception for localhost
- Verify device is on same network
- Use `http://127.0.0.1:8000` instead of localhost if on device

### AR Scanner Not Working
- Verify device supports ARKit (iPhone XS or later)
- Ensure camera permission is granted
- Check adequate lighting in room
- Try restarting the app

### Images Not Uploading
- Verify image is valid JPEG/PNG
- Check file size (compress if needed)
- Ensure base64 encoding is correct
- Verify backend `/chores/post` endpoint accepts image data

### Permissions Denied
- Go to Settings → ChoreMap
- Enable: Camera, Photos, Location
- Restart app

## Performance Optimization

1. **Image Compression:** Images converted to JPEG at 80% quality before sending
2. **Network Caching:** URLSession default caching enabled
3. **UI Rendering:** SwiftUI handles automatic optimization
4. **AR Performance:** RealityKit optimized for device capabilities

## Security Notes

1. **Local Network:** Info.plist configured for localhost network access
2. **HTTPS Ready:** App compatible with HTTPS (currently using HTTP for local dev)
3. **Data Privacy:** User passwords sent via POST (use HTTPS in production)
4. **Permission Scopes:** Camera, photo, and location permissions properly scoped

## Future Enhancements

1. Add offline data sync with Core Data
2. Implement push notifications for new chores
3. Add real-time chat between senior and volunteer
4. Enhanced 3D AR visualization with object detection
5. Video recording capability during AR scanning
6. Advanced location-based filtering
7. Payment integration for rewards
8. Multi-language support

## File Structure

```
ios/
├── ChoreMap.swift          # Main app file with all SwiftUI views
├── Info.plist              # App configuration and permissions
├── Package.swift           # Swift Package Manager configuration
└── README.md               # This file
```

## Support

For issues or questions:
1. Check backend logs: `backend/main.py`
2. Check network connectivity
3. Review error messages in Xcode console
4. Verify all prerequisites installed
5. Check that both backend and app are properly configured
