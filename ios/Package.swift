// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ChoreMap",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v15)
    ],
    targets: [
        .executableTarget(
            name: "ChoreMap",
            dependencies: [],
            resources: []
        )
    ]
)
