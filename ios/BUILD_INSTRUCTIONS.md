# iOS App Build Instructions & Developer Reference

## Quick Start (5 Minutes)

### Prerequisites Check
```bash
# Verify Xcode installed
xcode-select -v
# Should show: xcode-select version XXXX

# Verify Swift version
swift --version
# Should show: Swift version 5.9+
```

### Fast Setup
```bash
# 1. Navigate to project
cd ~/path/to/Young-Coders-Sphere-Code-for-Community-Challenge

# 2. Start backend (Terminal 1)
cd backend
python -m uvicorn main:app --reload --port 8000

# 3. Open iOS project (Terminal 2)
open -a Xcode ios/

# 4. In Xcode:
# - Select iPhone 15 simulator
# - Press Cmd+R to build and run
```

## Building from Command Line

### Build for Simulator
```bash
# Build only
xcodebuild -scheme ChoreMap -destination 'platform=iOS Simulator,name=iPhone 15'

# Build and run
xcodebuild -scheme ChoreMap -destination 'platform=iOS Simulator,name=iPhone 15' test
```

### Build for Device
```bash
# Connect iPhone and build
xcodebuild -scheme ChoreMap -destination 'platform=iOS,name=iPhone 15'
```

### Archive for Distribution
```bash
# Create archive
xcodebuild -scheme ChoreMap -archivePath build/ChoreMap.xcarchive archive

# Export for App Store
xcodebuild -exportArchive \
  -archivePath build/ChoreMap.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ExportOptions.plist
```

## Project Structure Overview

### Main Files

**ChoreMap.swift** (Main Application File)
- `@main struct ChoreMapApp` - App entry point
- `struct User` - User model (Codable)
- `struct Chore` - Chore model (Codable)
- `struct Reward` - Reward model (Codable)
- `struct ChoreAnalysis` - AI analysis result
- `class AuthManager` - Authentication state
- `struct AuthView` - Login/register screen
- `struct SeniorDashboard` - Senior main view
- `struct SeniorChoreRequestView` - Create chore (with AR)
- `struct SeniorChoresListView` - View posted chores
- `struct VolunteerDashboard` - Volunteer main view
- `struct AvailableChoresView` - Browse chores
- `struct LeaderboardView` - Rankings
- `struct RewardsView` - Available rewards
- `struct ARScannerView` - AR environment scanner
- `class ARViewControllerWrapper` - AR implementation
- `struct ImagePicker` - Photo library integration
- **Total Lines:** ~1,200 (well-organized, modular)

**ChoreMapNetworking.swift** (API Layer)
- `class APIService` - Centralized API service
- Methods:
  - `register()` - User registration
  - `login()` - User authentication
  - `postChore()` - Create chore
  - `fetchAllChores()` - Get chores
  - `claimChore()` - Claim a chore
  - `analyzeChoreImage()` - AI analysis
  - `fetchLeaderboard()` - Rankings
  - `fetchRewards()` - Available rewards
  - `fetchUserPoints()` - Get user points
- `enum APIError` - Error handling
- `enum AnyCodable` - JSON helper
- **Total Lines:** ~400 (clean, reusable)

**Info.plist** (App Configuration)
- Bundle identifier
- iOS deployment target (15.0)
- Camera permission request
- Photo library permission
- Location permission
- Local network configuration
- App Transport Security settings

**Package.swift** (Swift Package Manifest)
- Package definition
- Platform requirements (iOS 15+)
- Executable target
- Dependencies (native only)

### Documentation Files

**README.md**
- Project overview
- Architecture explanation
- Setup instructions
- Feature descriptions
- Testing workflows
- Troubleshooting guide

**SETUP_GUIDE.md**
- Detailed installation steps
- Build configuration
- Network setup
- Verification checklist
- Testing procedures
- Debugging tips
- Production deployment

**AR_IMPLEMENTATION.md**
- ARKit technical details
- RealityKit setup
- Plane detection explanation
- Image capture process
- Backend integration
- Performance optimization
- Device compatibility

**FEATURES.md** (This File)
- Complete feature checklist
- Architecture diagrams
- File structure
- API endpoint coverage
- Technology stack
- Testing coverage
- Future enhancements

**BUILD_INSTRUCTIONS.md** (This File)
- Quick start guide
- Command-line building
- Code structure
- Build troubleshooting
- Development workflow

## Code Organization

### Separation of Concerns

**View Layer (ChoreMap.swift)**
- All SwiftUI components
- User interface logic
- Navigation handling
- Form management
- List rendering

**Business Logic (ChoreMap.swift)**
- AuthManager for state
- State @Published variables
- User role logic
- Data filtering

**Network Layer (ChoreMapNetworking.swift)**
- APIService singleton
- URLSession configuration
- Request/response handling
- Error management
- JSON encoding/decoding

**AR Layer (ChoreMap.swift)**
- ARScannerView wrapper
- ARViewControllerWrapper implementation
- Image capture logic
- ARKit integration

### Key Design Patterns

**MVVM-like Architecture:**
- Models: Codable structs
- Views: SwiftUI components
- ViewModels: AuthManager, state managers

**Singleton Pattern:**
- `APIService.shared` for centralized API calls

**Observer Pattern:**
- `@Published` properties in AuthManager
- SwiftUI reactive updates

**Delegation Pattern:**
- Image picker coordinator
- AR view controller delegate

## Common Development Tasks

### Add a New API Endpoint

1. **Add to APIService class:**
```swift
func newEndpoint(param: String) async throws -> ResponseType {
    let endpoint = "\(apiBase)/path/endpoint"
    var request = URLRequest(url: URL(string: endpoint)!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(payload)
    
    let (data, response) = try await session.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
        throw APIError.invalidResponse
    }
    
    return try JSONDecoder().decode(ResponseType.self, from: data)
}
```

2. **Call from view:**
```swift
@State private var data: ResponseType?

Task {
    do {
        data = try await APIService.shared.newEndpoint(param: value)
    } catch {
        print("Error: \(error)")
    }
}
```

### Add a New Model

```swift
struct NewModel: Codable, Identifiable {
    let id: Int
    let name: String
    let value: String
    
    enum CodingKeys: String, CodingKey {
        case id, name, value
        // Map snake_case to camelCase if needed
        case customField = "custom_field"
    }
}
```

### Update Network Base URL

**For Production:**
```swift
// In ChoreMapNetworking.swift, APIService class
private let apiBase = "https://api.choremap.com"  // Production
```

**For Local Testing:**
```swift
private let apiBase = "http://localhost:8000"  // Local
// or
private let apiBase = "http://192.168.1.100:8000"  // Device to Mac
```

### Modify Permission Requests

Edit `Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Your custom message here</string>
```

## Debugging Workflow

### 1. Enable Console Logging
```swift
// Add to any view for debugging
.onAppear {
    print("View appeared")
    print("Data: \(data)")
}
```

### 2. Breakpoint Debugging
- Click line number to set breakpoint
- Run app (⌘R)
- Debug console appears automatically
- Step through code with buttons

### 3. View Hierarchy
- Debug → View Hierarchy (⌘⌥6)
- Inspect view tree
- Check layout constraints
- Identify rendering issues

### 4. Network Debugging
```bash
# Monitor network traffic on Mac
# Use Charles Proxy or similar tool
# Point app to proxy: http://proxy.ip:8888
```

## Build Optimization

### Reduce Build Time
```bash
# 1. Enable parallel compilation
defaults write com.apple.dt.Xcode IDEBuildOperationMaxNumberOfConcurrentCompileTasks $(sysctl -n hw.ncpu)

# 2. Use whole module optimization (Release only)
# Build Settings → Optimization Level → Whole Module Optimization

# 3. Clean regularly
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### Reduce App Size
```swift
// Compress images
if let imageData = image.jpegData(compressionQuality: 0.6) {
    // Reduces from ~2MB to ~300KB
}

// Remove unused code
// Run Product → Analyze to find dead code
```

## Performance Profiling

### CPU Usage
1. Product → Profile (⌘I)
2. Select "System Trace"
3. Record while using app
4. Analyze hot code paths

### Memory Usage
1. Product → Profile
2. Select "Allocations"
3. Watch memory grow
4. Identify leaks

### Battery Usage
1. Product → Profile
2. Select "Energy Impact"
3. Monitor drain
4. Optimize high-drain operations

## Testing Strategies

### Manual Testing Checklist
- [ ] Authentication (register/login)
- [ ] Create chore with image
- [ ] Create chore with AR scan
- [ ] Claim chore as volunteer
- [ ] View leaderboard
- [ ] Redeem reward
- [ ] Network connectivity
- [ ] Permissions handling
- [ ] Error states

### Edge Cases to Test
- [ ] Poor network connection
- [ ] Server errors (500, 401, etc.)
- [ ] Missing image permission
- [ ] Missing camera permission
- [ ] Invalid credentials
- [ ] Duplicate email on register
- [ ] Empty form submission
- [ ] Very large image upload

### Device Testing
- [ ] Simulator (Fast, no AR)
- [ ] iPhone (Real AR experience)
- [ ] iPad (Larger screen)
- [ ] Different iOS versions (15.0+)
- [ ] Different network (WiFi, cellular)

## Deployment Workflow

### Development → Testing
```bash
# 1. Build for simulator
xcodebuild -scheme ChoreMap test

# 2. Manual testing
# Run on simulator, verify features

# 3. Build for device
# Select device in Xcode
# ⌘R to run
```

### Testing → Beta (TestFlight)
```bash
# 1. Product → Archive
# 2. Validate app
# 3. Distribute to TestFlight
# 4. Invite testers
# 5. Collect feedback
```

### Beta → Production (App Store)
```bash
# 1. Final testing
# 2. Update version number
# 3. Archive app
# 4. Submit to App Review
# 5. Monitor approval status
```

## Important Xcode Shortcuts

| Action | Shortcut |
|--------|----------|
| Build | ⌘B |
| Run | ⌘R |
| Stop | ⌘. |
| Clean | ⌘⇧K |
| Archive | ⌘⇧B |
| Debug Area | ⌘⇧Y |
| Console | ⌘⇧C |
| Breakpoint | ⌘\ |
| Step Over | F6 |
| Step Into | F7 |
| Step Out | F8 |
| Continue | ⌘\ |

## Troubleshooting Build Issues

### "Module not found"
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Rebuild
⌘B
```

### "Code signature invalid"
```bash
# Re-sign
# Build Settings → Code Signing
# Clear all signing settings
# Rebuild with "Automatically manage signing"
```

### "Compiler errors"
```bash
# Check Swift version compatibility
swift --version

# Update to Swift 5.9+
# In Build Settings → Swift Language Version
```

### "App crashes on launch"
```bash
# Check console output (⌘⇧C)
# Look for runtime errors
# Add try-catch blocks around suspicious code
```

## Version Control Best Practices

### Gitignore for iOS
```
# Xcode
build/
DerivedData/
xcuserdata/
*.xcworkspace/xcuserdata/

# CocoaPods
Pods/
Podfile.lock

# Package Manager
.swiftpm/

# IDE
.vscode/
.idea/

# OS
.DS_Store
```

### Commit Message Format
```
[FEATURE] Add new chore request view
[BUGFIX] Fix AR plane detection lag
[DOCS] Update README with setup guide
[REFACTOR] Simplify API service
[TEST] Add unit tests for authentication
```

## Resources & Documentation

- [Apple ARKit Documentation](https://developer.apple.com/arkit/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [URLSession Guide](https://developer.apple.com/documentation/foundation/urlsession)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## Support Contacts

- **For iOS/Swift Issues:** Apple Developer Forums
- **For ARKit Issues:** WWDC Sessions, Apple Documentation
- **For App Store Issues:** App Store Connect Support
- **For Backend Issues:** See backend documentation

---

**Last Updated:** July 2, 2026
**Xcode Version:** 15.0+
**Swift Version:** 5.9+
**iOS Support:** 15.0+
