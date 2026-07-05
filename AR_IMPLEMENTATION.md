# iOS App - ARKit Implementation Details

## ARKit 6.0+ Integration Guide

### Overview
The ChoreMap iOS app uses ARKit 6.0 and RealityKit 2.0 to enable real-time environment scanning, 3D visualization, and AR-enhanced chore documentation.

## Key AR Features

### 1. Real-Time Environment Scanning

The ARScannerView captures and processes the physical environment:

**Capabilities:**
- Plane detection (floors, walls, tables, ceilings)
- Light estimation for realistic rendering
- Environment textures and materials
- 3D coordinate space mapping

**Use Cases:**
- Identifying chore areas (walls, floors, fixtures)
- Measuring spaces for renovation/repair tasks
- Capturing context around damage/issues
- Documenting object locations

### 2. Image & Video Capture

**Image Capture:**
```swift
// ARView snapshot captures current AR view
func captureImage() {
    if let image = arView.snapshot() {
        // Image includes AR overlays, planes, and environment
        // Convert to base64 and send to backend
        if let base64 = image.toBase64() {
            // Send to /chores/analyze endpoint
        }
    }
}
```

**Captured Image Contents:**
- Live camera feed
- Detected planes and surfaces
- AR coordinate system visualization
- Environment lighting and materials

### 3. 3D Object Visualization

**Plane Detection:**
- Real-time identification of horizontal/vertical surfaces
- Color-coded visualization:
  - Green: Detected floor/horizontal planes
  - Blue: Detected walls/vertical planes
  - Yellow: Temporary planes

**Distance Measurement:**
- Can measure distances between points
- Helpful for chore size estimation
- Guidance for volunteer preparation

### 4. Video Recording

**Capability:**
- Record AR session with environment
- Capture dynamic scanning process
- Create video documentation of chore areas

**Implementation:**
```swift
// Future enhancement - video recording during AR scan
class ARSessionRecorder {
    func startRecording()
    func stopRecording() -> URL? // Returns video file URL
    func saveVideoToPhotos()
}
```

## Technical Architecture

### ARSession Configuration

```swift
let configuration = ARWorldTrackingConfiguration()

// Enable plane detection
configuration.planeDetection = [.horizontal, .vertical]

// Enable light estimation
configuration.environmentTexturing = .automatic

// For devices with LiDAR (iPhone 12 Pro+)
if ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth) {
    configuration.frameSemantics.insert(.personSegmentationWithDepth)
}

// Start session
arView.session.run(configuration)
```

### RealityKit Rendering

**AR View Setup:**
```swift
class ARViewControllerWrapper: UIViewController {
    var arView: ARView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Create AR view with full screen bounds
        arView = ARView(frame: view.bounds)
        
        // Set up AR session
        var configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = [.horizontal, .vertical]
        
        arView.session.run(configuration)
        
        view.addSubview(arView)
    }
}
```

## Feature Implementation

### 1. Plane Detection & Visualization

**Real-time Plane Detection:**
```swift
// RealityKit automatically detects and updates planes
// Visual representation handled by ARView's plane tracking

// Detected planes available in ARSession frame
for anchor in frame.anchors {
    if let planeAnchor = anchor as? PlaneAnchor {
        // Process plane
        let extent = planeAnchor.extent
        let center = planeAnchor.center
        let classification = planeAnchor.classification
        
        // Planes are automatically visualized with detection meshes
    }
}
```

**Classification Types:**
- `.wall` - Vertical surfaces
- `.floor` - Horizontal ground planes
- `.ceiling` - Horizontal ceiling planes
- `.table` - Horizontal table/counter surfaces
- `.seat` - Seating surfaces
- `.unknown` - Unclassified surfaces

### 2. Image Capture Process

**Current Implementation:**
```swift
@objc func captureImage() {
    // Capture current AR view as UIImage
    if let image = arView.snapshot() {
        // Image includes camera feed + AR visualization
        onImageCapture?(image)
    }
}
```

**Image Content:**
- Raw camera frame
- AR plane visualizations
- Coordinate system indicators
- Environmental lighting

**Optimization:**
- Compression to 80% JPEG quality
- Base64 encoding for JSON transmission
- ~500KB typical file size

### 3. Backend Integration for AR Analysis

**API Endpoint:**
```
POST /chores/analyze
Content-Type: application/json

{
    "image_base64": "...",
    "description": "..."
}
```

**Backend Processing:**
1. Decode base64 image
2. Run AI vision analysis (Gemini)
3. Extract:
   - Tools needed
   - Safety hazards
   - Difficulty level
   - Estimated time
   - Step-by-step instructions
   - Required skills

**AI Analysis Example:**
```json
{
    "tools_needed": ["hammer", "nails", "level"],
    "steps": [
        "Remove old shelf",
        "Mark holes with level",
        "Drill pilot holes",
        "Install wall anchors",
        "Mount new shelf"
    ],
    "difficulty": "Intermediate",
    "estimated_time": "1-2 hours",
    "safety_notes": "Use eye protection, watch for electrical wires",
    "skills_needed": ["drilling", "measuring", "basic carpentry"]
}
```

## ARKit Capabilities by Device

| Feature | iPhone 12 | iPhone 13 | iPhone 14 | iPhone 15 |
|---------|-----------|-----------|-----------|-----------|
| Plane Detection | ✓ | ✓ | ✓ | ✓ |
| Light Estimation | ✓ | ✓ | ✓ | ✓ |
| Image Capture | ✓ | ✓ | ✓ | ✓ |
| LiDAR Support | Pro+ | Pro+ | Pro+ | Pro+ |
| Depth Estimation | | Pro+ | Pro+ | Pro+ |
| Person Segmentation | | Pro+ | Pro+ | Pro+ |

## Performance Optimization

### 1. Memory Management
```swift
override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    
    // Start AR session
    let configuration = ARWorldTrackingConfiguration()
    arView.session.run(configuration)
}

override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    
    // Pause AR session to save battery
    arView.session.pause()
}
```

### 2. Frame Rate Management
- Default: 60 FPS for fluid experience
- Can reduce to 30 FPS for older devices
- Affects battery life and thermal load

### 3. Plane Detection Optimization
```swift
let configuration = ARWorldTrackingConfiguration()

// Detect only necessary planes
configuration.planeDetection = [.horizontal, .vertical]

// Disable if not needed
// configuration.planeDetection = []

arView.session.run(configuration)
```

## Troubleshooting

### AR Not Starting
1. Check device supports ARKit (iPhone XS or later)
2. Verify camera permissions granted
3. Ensure adequate lighting
4. Restart the app
5. Check iOS version (15.0+)

### Poor Plane Detection
1. Ensure sufficient lighting
2. Move camera slowly
3. Point at textured surfaces
4. Avoid reflective surfaces
5. Wait for initialization (5-10 seconds)

### Image Capture Black/Blank
1. AR session may not be initialized
2. Lighting too low
3. Camera permission not granted
4. Try again after 5 seconds

### Battery Drain
1. AR processing is intensive
2. Close unnecessary background apps
3. Reduce brightness
4. Disable location if not needed
5. Use WiFi instead of cellular

## Future Enhancements

### 1. Object Detection
```swift
// Using Vision framework with ML models
import Vision

// Detect specific objects (tools, furniture, damage, etc.)
let request = VNCoreMLRequest(model: ml_model)
```

### 2. 3D Model Insertion
```swift
// Place 3D models in AR space for visualization
// Example: Show proposed furniture placement
import ModelIO

let model = MDLMesh(...)
let anchor = AnchorEntity(plane: .horizontal)
anchor.addChild(ModelEntity(mesh: ..., materials: [...]))
```

### 3. Real-time Collaboration
```swift
// Multiple users seeing same AR scene
// Requires ARKit 4.0+ and multiplayer framework
```

### 4. Persistent Space Mapping
```swift
// Save AR map for later reference
arView.session.getCurrentWorldMap { worldMap, error in
    // Save worldMap
}

// Load saved AR map
arView.session.run(configuration, options: .resetTracking)
```

## Security Considerations

1. **User Privacy:**
   - Only capture what's necessary
   - Ask permission before capturing
   - Don't store videos indefinitely
   - Option to delete captured images

2. **Data Transmission:**
   - Compress images before sending
   - Use HTTPS in production
   - Implement end-to-end encryption for sensitive areas

3. **Third-party Analysis:**
   - Disclose when AI analyzes captured images
   - Allow users to opt-out
   - Clear data retention policies

## Permissions Required

**Info.plist entries:**
```xml
<key>NSCameraUsageDescription</key>
<string>ChoreMap uses your camera to scan chore areas with AR for better analysis.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>ChoreMap saves AR capture images to your photo library.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>ChoreMap uses location to help match nearby volunteers.</string>
```

## Testing AR Features

### Unit Tests
```swift
class ARKitTests: XCTestCase {
    func testPlaneDetection() {
        // Test plane detection triggers correctly
    }
    
    func testImageCapture() {
        // Test snapshot returns valid UIImage
    }
    
    func testARSessionInitialization() {
        // Test ARSession configures properly
    }
}
```

### Integration Tests
1. Manual testing on actual device
2. Verify plane detection in various environments
3. Test image capture quality
4. Verify backend analysis integration
5. Test with different lighting conditions

## Related Backend Integration

The backend processes AR-captured images using:
- **Gemini AI Vision**: Analyzes images for tools, difficulty, safety
- **Custom ML Models**: Detects specific items/hazards
- **Computer Vision**: Measures, classifies, estimates time

See `backend/services/ai_analyzer.py` for implementation details.

## References

- [ARKit Documentation](https://developer.apple.com/arkit/)
- [RealityKit Documentation](https://developer.apple.com/documentation/realitykit)
- [Vision Framework](https://developer.apple.com/documentation/vision)
- [Apple AR Resources](https://developer.apple.com/augmented-reality/)
