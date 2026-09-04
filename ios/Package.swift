// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Chore4More",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v15)
    ],
    targets: [
        .executableTarget(
            name: "Chore4More",
            dependencies: [],
            resources: []
        )
    ]
)
