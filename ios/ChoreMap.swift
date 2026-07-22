import SwiftUI
import ARKit
import RealityKit

// MARK: - Main App Entry Point
@main
struct ChoreMapApp: App {
    @StateObject private var authManager = AuthManager()
    
    var body: some Scene {
        WindowGroup {
            if authManager.isLoggedIn {
                if authManager.userRole == "senior" {
                    SeniorDashboard()
                        .environmentObject(authManager)
                } else {
                    VolunteerDashboard()
                        .environmentObject(authManager)
                }
            } else {
                AuthView()
                    .environmentObject(authManager)
            }
        }
    }
}

// MARK: - Models
struct User: Codable {
    let id: Int
    let name: String
    let email: String
    let role: String
    let points: Int?
}

struct Chore: Codable, Identifiable {
    let id: Int
    let title: String
    let description: String
    let location: String
    let status: String
    let seniorId: Int?
    let volunteerId: Int?
    let aiDifficulty: String?
    let aiEstimatedTime: String?
    let aiSafetyNotes: String?
    let aiSteps: [String]?
    let aiToolsNeeded: [String]?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description, location, status
        case seniorId = "senior_id"
        case volunteerId = "volunteer_id"
        case aiDifficulty = "ai_difficulty"
        case aiEstimatedTime = "ai_estimated_time"
        case aiSafetyNotes = "ai_safety_notes"
        case aiSteps = "ai_steps"
        case aiToolsNeeded = "ai_tools_needed"
    }
}

struct Reward: Codable, Identifiable {
    let id: Int
    let title: String
    let description: String
    let businessName: String
    let pointsNeeded: Int
    
    enum CodingKeys: String, CodingKey {
        case id, title, description
        case businessName = "business_name"
        case pointsNeeded = "points_needed"
    }
}

struct ChoreAnalysis: Codable {
    let toolsNeeded: [String]?
    let steps: [String]?
    let skillsNeeded: [String]?
    let difficulty: String?
    let estimatedTime: String?
    let safetyNotes: String?
    
    enum CodingKeys: String, CodingKey {
        case toolsNeeded = "tools_needed"
        case steps
        case skillsNeeded = "skills_needed"
        case difficulty
        case estimatedTime = "estimated_time"
        case safetyNotes = "safety_notes"
    }
}

// MARK: - Authentication Manager
class AuthManager: ObservableObject {
    @Published var isLoggedIn = false
    @Published var userId: Int?
    @Published var userName: String = ""
    @Published var userRole: String = ""
    
    private let apiBase = "http://localhost:8000"
    
    func register(name: String, email: String, password: String, role: String) async {
        let url = URL(string: "\(apiBase)/users/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = ["name": name, "email": email, "password": password, "role": role]
        request.httpBody = try? JSONEncoder().encode(payload)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let response = try JSONDecoder().decode([String: Int].self, from: data) as? [String: Any],
               let userId = response["user_id"] as? Int {
                DispatchQueue.main.async {
                    self.userId = userId
                    self.userName = name
                    self.userRole = role
                    self.isLoggedIn = true
                }
            }
        } catch {
            print("Registration failed: \(error)")
        }
    }
    
    func login(email: String, password: String) async {
        let url = URL(string: "\(apiBase)/users/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = ["email": email, "password": password]
        request.httpBody = try? JSONEncoder().encode(payload)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode([String: String].self, from: data)
            if let userIdStr = response["user_id"],
               let userId = Int(userIdStr),
               let name = response["name"],
               let role = response["role"] {
                DispatchQueue.main.async {
                    self.userId = userId
                    self.userName = name
                    self.userRole = role
                    self.isLoggedIn = true
                }
            }
        } catch {
            print("Login failed: \(error)")
        }
    }
    
    func logout() {
        DispatchQueue.main.async {
            self.isLoggedIn = false
            self.userId = nil
            self.userName = ""
            self.userRole = ""
        }
    }
}

// MARK: - Authentication View
struct AuthView: View {
    @State private var isLogin = true
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var role = "volunteer"
    @State private var isLoading = false
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.03, green: 0.05, blue: 0.15),
                    Color(red: 0.08, green: 0.11, blue: 0.25)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("ChoreMap")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.white)
                    Text("Community help, perfectly coordinated")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24)
                
                ScrollView {
                    VStack(spacing: 20) {
                        VStack(spacing: 12) {
                            Text(isLogin ? "Sign in to continue" : "Create your account")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            Text(isLogin ? "Access your chores and community" : "Start helping or get support today")
                                .font(.system(size: 14, weight: .regular))
                                .foregroundColor(Color(white: 0.6))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.bottom, 8)
                        
                        if !isLogin {
                            TextField("Full Name", text: $name)
                                .textFieldStyle(.roundedBorder)
                                .foregroundColor(.black)
                        }
                        
                        TextField("Email", text: $email)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.emailAddress)
                            .foregroundColor(.black)
                        
                        SecureField("Password", text: $password)
                            .textFieldStyle(.roundedBorder)
                            .foregroundColor(.black)
                        
                        if !isLogin {
                            Picker("Role", selection: $role) {
                                Text("Volunteer").tag("volunteer")
                                Text("Senior").tag("senior")
                            }
                            .pickerStyle(.segmented)
                        }
                        
                        Button(action: handleAuth) {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text(isLogin ? "Sign In" : "Create Account")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(Color(red: 0.3, green: 0.6, blue: 0.9))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .disabled(isLoading)
                        
                        HStack(spacing: 6) {
                            Text(isLogin ? "Don't have an account?" : "Already have an account?")
                                .foregroundColor(.gray)
                            Button(action: { isLogin.toggle() }) {
                                Text(isLogin ? "Sign up" : "Sign in")
                                    .foregroundColor(Color(red: 0.3, green: 0.6, blue: 0.9))
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                    }
                    .padding(24)
                }
            }
        }
    }
    
    private func handleAuth() {
        isLoading = true
        Task {
            if isLogin {
                await authManager.login(email: email, password: password)
            } else {
                await authManager.register(name: name, email: email, password: password, role: role)
            }
            isLoading = false
        }
    }
}

// MARK: - Senior Dashboard
struct SeniorDashboard: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showingChoreForm = false
    @State private var chores: [Chore] = []
    @State private var selectedTab = "create"
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.97, green: 0.97, blue: 0.97),
                    Color(red: 0.95, green: 0.98, blue: 1.0)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 12) {
                    Text("Senior Workspace")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.black)
                    Text("Welcome back, \(authManager.userName)")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
                .background(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
                
                // Tab Selection
                HStack(spacing: 12) {
                    ForEach(["create", "active"], id: \.self) { tab in
                        VStack(spacing: 4) {
                            Text(tab == "create" ? "Post Request" : "Your Chores")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(selectedTab == tab ? Color.black : Color.gray.opacity(0.1))
                                .foregroundColor(selectedTab == tab ? .white : .black)
                                .cornerRadius(10)
                        }
                        .onTapGesture { selectedTab = tab }
                    }
                }
                .padding(16)
                
                if selectedTab == "create" {
                    SeniorChoreRequestView()
                } else {
                    SeniorChoresListView(chores: $chores)
                }
                
                // Logout
                VStack {
                    Button(action: { authManager.logout() }) {
                        Text("Logout")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .cornerRadius(10)
                    }
                }
                .padding(16)
            }
        }
    }
}

// MARK: - Senior Chore Request View (with AR)
struct SeniorChoreRequestView: View {
    @State private var title = ""
    @State private var description = ""
    @State private var location = ""
    @State private var selectedImage: UIImage?
    @State private var showImagePicker = false
    @State private var showARScanner = false
    @State private var aiAnalysis: ChoreAnalysis?
    @State private var isAnalyzing = false
    @State private var showSuccess = false
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Title
                VStack(alignment: .leading, spacing: 6) {
                    Text("Chore Title")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.gray)
                    TextField("e.g., Fix kitchen faucet", text: $title)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 12)
                        .background(Color.white)
                        .cornerRadius(10)
                }
                
                // Description
                VStack(alignment: .leading, spacing: 6) {
                    Text("Description")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.gray)
                    TextEditor(text: $description)
                        .frame(height: 100)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(Color.white)
                        .cornerRadius(10)
                }
                
                // Location
                VStack(alignment: .leading, spacing: 6) {
                    Text("Location")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.gray)
                    TextField("e.g., 123 Main St, Living Room", text: $location)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 12)
                        .background(Color.white)
                        .cornerRadius(10)
                }
                
                // Image Picker
                VStack(spacing: 8) {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(height: 200)
                            .cornerRadius(10)
                            .clipped()
                    }
                    
                    HStack(spacing: 8) {
                        Button(action: { showImagePicker = true }) {
                            HStack {
                                Image(systemName: "photo.fill")
                                Text("Upload Photo")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(10)
                        }
                        
                        Button(action: { showARScanner = true }) {
                            HStack {
                                Image(systemName: "arkit.badge.xmark")
                                Text("Scan Area")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.purple.opacity(0.1))
                            .foregroundColor(.purple)
                            .cornerRadius(10)
                        }
                    }
                }
                
                // AI Analysis
                if let analysis = aiAnalysis {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("AI Analysis")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.black)
                        
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Difficulty").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                                Text(analysis.difficulty ?? "—").font(.system(size: 13, weight: .bold))
                            }
                            Divider()
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Time").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                                Text(analysis.estimatedTime ?? "—").font(.system(size: 13, weight: .bold))
                            }
                        }
                        
                        if let safety = analysis.safetyNotes {
                            Text("⚠️ \(safety)")
                                .font(.system(size: 12, weight: .regular))
                                .foregroundColor(.orange)
                        }
                    }
                    .padding(12)
                    .background(Color.purple.opacity(0.05))
                    .cornerRadius(10)
                }
                
                // Submit Button
                Button(action: submitChore) {
                    if isAnalyzing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Post Chore Request")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.black)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(title.isEmpty || description.isEmpty || location.isEmpty)
            }
            .padding(16)
        }
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(image: $selectedImage)
        }
        .sheet(isPresented: $showARScanner) {
            ARScannerView(image: $selectedImage)
        }
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { }
        }
    }
    
    private func submitChore() {
        // Implementation for posting chore to backend
    }
}

// MARK: - Senior Chores List View
struct SeniorChoresListView: View {
    @Binding var chores: [Chore]
    @State private var isLoading = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if chores.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        Text("No chores posted yet")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    ForEach(chores) { chore in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(chore.title)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.black)
                                    Text(chore.location)
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                Text(chore.status)
                                    .font(.system(size: 11, weight: .semibold))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(statusColor(chore.status))
                                    .foregroundColor(.white)
                                    .cornerRadius(6)
                            }
                        }
                        .padding(12)
                        .background(Color.white)
                        .cornerRadius(10)
                    }
                }
            }
            .padding(16)
        }
        .onAppear { loadChores() }
    }
    
    private func loadChores() {
        // Implementation for loading chores from backend
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status {
        case "open": return .green
        case "claimed": return .orange
        case "completed": return .blue
        default: return .gray
        }
    }
}

// MARK: - Volunteer Dashboard
struct VolunteerDashboard: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedTab = 0
    @State private var chores: [Chore] = []
    @State private var leaders: [(String, Int, Int)] = []
    @State private var rewards: [Reward] = []
    @State private var points = 0
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.97, green: 0.97, blue: 0.97),
                    Color(red: 0.95, green: 0.98, blue: 1.0)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header with Points
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Welcome, \(authManager.userName)")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.black)
                            Text("Find meaningful work in your community")
                                .font(.system(size: 13, weight: .regular))
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Points Balance")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.gray)
                            Text("\(points) pts")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.black)
                        }
                    }
                }
                .padding(20)
                .background(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
                
                // Tab Selection
                HStack(spacing: 0) {
                    ForEach(0..<3, id: \.self) { index in
                        VStack {
                            Text(["Available", "Leaderboard", "Rewards"][index])
                                .font(.system(size: 13, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(selectedTab == index ? Color.black : Color.clear)
                                .foregroundColor(selectedTab == index ? .white : .black)
                        }
                        .onTapGesture { selectedTab = index }
                    }
                }
                .background(Color.white)
                
                // Tab Content
                Group {
                    if selectedTab == 0 {
                        AvailableChoresView(chores: $chores)
                    } else if selectedTab == 1 {
                        LeaderboardView(leaders: $leaders)
                    } else {
                        RewardsView(rewards: $rewards, points: points)
                    }
                }
                
                // Logout
                VStack {
                    Button(action: { authManager.logout() }) {
                        Text("Logout")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .cornerRadius(10)
                    }
                }
                .padding(16)
            }
        }
        .onAppear { loadData() }
    }
    
    private func loadData() {
        // Implementation for loading volunteer data
    }
}

// MARK: - Available Chores View
struct AvailableChoresView: View {
    @Binding var chores: [Chore]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if chores.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        Text("No chores available right now")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.gray)
                        Text("Check back soon")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    ForEach(chores) { chore in
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(chore.title)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.black)
                                    Text(chore.description)
                                        .font(.system(size: 13, weight: .regular))
                                        .foregroundColor(.gray)
                                        .lineLimit(2)
                                }
                                Spacer()
                            }
                            
                            if let difficulty = chore.aiDifficulty {
                                HStack(spacing: 12) {
                                    Text("📊 \(difficulty)")
                                        .font(.system(size: 12, weight: .semibold))
                                    if let time = chore.aiEstimatedTime {
                                        Text("⏱️ \(time)")
                                            .font(.system(size: 12, weight: .semibold))
                                    }
                                }
                                .foregroundColor(.blue)
                            }
                            
                            HStack {
                                Image(systemName: "location.fill")
                                    .font(.system(size: 12))
                                Text(chore.location)
                                    .font(.system(size: 12, weight: .regular))
                            }
                            .foregroundColor(.gray)
                            
                            Button(action: { claimChore(chore) }) {
                                Text("Claim Chore")
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(Color.green)
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                                    .font(.system(size: 13, weight: .semibold))
                            }
                        }
                        .padding(14)
                        .background(Color.white)
                        .cornerRadius(10)
                    }
                }
            }
            .padding(16)
        }
    }
    
    private func claimChore(_ chore: Chore) {
        // Implementation for claiming a chore
    }
}

// MARK: - Leaderboard View
struct LeaderboardView: View {
    @Binding var leaders: [(String, Int, Int)]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if leaders.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "podium.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        Text("Leaderboard coming soon")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    ForEach(0..<leaders.count, id: \.self) { index in
                        let (name, chores, points) = leaders[index]
                        HStack {
                            VStack(alignment: .center, spacing: 4) {
                                Text("#\(index + 1)")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .frame(width: 50, height: 50)
                            .background(Color.black)
                            .cornerRadius(25)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(name)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.black)
                                Text("\(chores) chores completed")
                                    .font(.system(size: 12, weight: .regular))
                                    .foregroundColor(.gray)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("\(points) pts")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.orange)
                            }
                        }
                        .padding(14)
                        .background(Color.white)
                        .cornerRadius(10)
                    }
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Rewards View
struct RewardsView: View {
    @Binding var rewards: [Reward]
    let points: Int
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your Balance")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.gray)
                    Text("\(points) Points")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.black)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(Color.white)
                .cornerRadius(10)
                
                if rewards.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "gift.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        Text("No rewards available")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    ForEach(rewards) { reward in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(reward.title)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.black)
                                    Text(reward.businessName)
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                Text("\(reward.pointsNeeded) pts")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.orange)
                            }
                            
                            Text(reward.description)
                                .font(.system(size: 12, weight: .regular))
                                .foregroundColor(.gray)
                            
                            if points >= reward.pointsNeeded {
                                Button(action: { redeemReward(reward) }) {
                                    Text("Redeem")
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(Color.green)
                                        .foregroundColor(.white)
                                        .cornerRadius(8)
                                        .font(.system(size: 12, weight: .semibold))
                                }
                            }
                        }
                        .padding(14)
                        .background(points >= reward.pointsNeeded ? Color.green.opacity(0.05) : Color.gray.opacity(0.05))
                        .cornerRadius(10)
                    }
                }
            }
            .padding(16)
        }
    }
    
    private func redeemReward(_ reward: Reward) {
        // Implementation for redeeming reward
    }
}

// MARK: - AR Scanner View
struct ARScannerView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) var dismiss
    
    func makeUIViewController(context: Context) -> ARViewControllerWrapper {
        let controller = ARViewControllerWrapper()
        controller.onImageCapture = { capturedImage in
            image = capturedImage
            dismiss()
        }
        return controller
    }
    
    func updateUIViewController(_ uiViewController: ARViewControllerWrapper, context: Context) {}
}

// MARK: - AR View Controller Wrapper
class ARViewControllerWrapper: UIViewController, ARViewDelegate {
    var arView: ARView!
    var onImageCapture: ((UIImage) -> Void)?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Initialize AR View
        arView = ARView(frame: view.bounds)
        view.addSubview(arView)
        
        // Add button to capture screenshot
        let captureButton = UIButton(frame: CGRect(x: 20, y: 80, width: 120, height: 44))
        captureButton.setTitle("Capture", for: .normal)
        captureButton.backgroundColor = .systemBlue
        captureButton.layer.cornerRadius = 8
        captureButton.addTarget(self, action: #selector(captureImage), for: .touchUpInside)
        view.addSubview(captureButton)
        
        let closeButton = UIButton(frame: CGRect(x: view.bounds.width - 100, y: 80, width: 80, height: 44))
        closeButton.setTitle("Close", for: .normal)
        closeButton.backgroundColor = .systemRed
        closeButton.layer.cornerRadius = 8
        closeButton.addTarget(self, action: #selector(closeAR), for: .touchUpInside)
        view.addSubview(closeButton)
    }
    
    @objc func captureImage() {
        if let image = arView.snapshot() {
            onImageCapture?(image)
        }
    }
    
    @objc func closeAR() {
        dismiss(animated: true)
    }
}

protocol ARViewDelegate: AnyObject {}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }
    }
}
