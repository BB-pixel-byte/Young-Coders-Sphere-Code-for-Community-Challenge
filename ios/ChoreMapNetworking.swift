// ChoreMapNetworking.swift
// Centralized networking utilities for ChoreMap iOS app

import Foundation

// MARK: - API Service Layer

class APIService {
    static let shared = APIService()
    private let apiBase = "http://localhost:8000"
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Authentication APIs
    
    func register(name: String, email: String, password: String, role: String) async throws -> (userId: Int, userName: String, userRole: String) {
        let endpoint = "\(apiBase)/users/register"
        let payload: [String: String] = [
            "name": name,
            "email": email,
            "password": password,
            "role": role
        ]
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoded = try JSONDecoder().decode([String: AnyCodable].self, from: data)
        guard let userId = decoded["user_id"]?.asInt else {
            throw APIError.decodingError
        }
        
        return (userId, name, role)
    }
    
    func login(email: String, password: String) async throws -> (userId: Int, userName: String, userRole: String) {
        let endpoint = "\(apiBase)/users/login"
        let payload: [String: String] = [
            "email": email,
            "password": password
        ]
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoded = try JSONDecoder().decode([String: String].self, from: data)
        guard let userIdStr = decoded["user_id"],
              let userId = Int(userIdStr),
              let name = decoded["name"],
              let role = decoded["role"] else {
            throw APIError.decodingError
        }
        
        return (userId, name, role)
    }
    
    // MARK: - Chore APIs
    
    func postChore(title: String, description: String, location: String, imageBase64: String?, aiAnalysis: ChoreAnalysis?, userId: Int) async throws {
        let endpoint = "\(apiBase)/chores/post"
        
        var payload: [String: Any] = [
            "title": title,
            "description": description,
            "location": location,
            "posted_by": userId
        ]
        
        if let base64 = imageBase64 {
            payload["image_base64"] = base64
        }
        
        if let analysis = aiAnalysis {
            payload["ai_tools"] = analysis.toolsNeeded?.joined(separator: ",") ?? ""
            payload["ai_steps"] = analysis.steps?.joined(separator: ",") ?? ""
            payload["ai_skills_needed"] = analysis.skillsNeeded?.joined(separator: ",") ?? ""
            payload["ai_difficulty"] = analysis.difficulty ?? ""
            payload["ai_estimated_time"] = analysis.estimatedTime ?? ""
            payload["ai_safety_notes"] = analysis.safetyNotes ?? ""
        }
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
    
    func fetchAllChores() async throws -> [Chore] {
        let endpoint = "\(apiBase)/chores/all"
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let chores = try decoder.decode([Chore].self, from: data)
        
        return chores
    }
    
    func claimChore(choreId: Int, volunteerId: Int) async throws {
        let endpoint = "\(apiBase)/chores/\(choreId)/claim"
        let payload: [String: Int] = ["volunteer_id": volunteerId]
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
    
    func analyzeChoreImage(imageBase64: String, description: String) async throws -> ChoreAnalysis {
        let endpoint = "\(apiBase)/chores/analyze"
        let payload: [String: String] = [
            "image_base64": imageBase64,
            "description": description
        ]
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let analysis = try decoder.decode(ChoreAnalysis.self, from: data)
        
        return analysis
    }
    
    // MARK: - Volunteer APIs
    
    func fetchLeaderboard() async throws -> [(name: String, choresCompleted: Int, points: Int)] {
        let endpoint = "\(apiBase)/volunteers/leaderboard"
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        struct LeaderboardEntry: Codable {
            let name: String
            let choresCompleted: Int?
            let points: Int?
        }
        
        let entries = try decoder.decode([LeaderboardEntry].self, from: data)
        return entries.map { ($0.name, $0.choresCompleted ?? 0, $0.points ?? 0) }
    }
    
    // MARK: - Rewards APIs
    
    func fetchRewards() async throws -> [Reward] {
        let endpoint = "\(apiBase)/rewards"
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let rewards = try decoder.decode([Reward].self, from: data)
        
        return rewards
    }
    
    func fetchUserPoints(userId: Int) async throws -> Int {
        let endpoint = "\(apiBase)/users/\(userId)"
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        struct UserResponse: Codable {
            let points: Int?
        }
        
        let decoded = try JSONDecoder().decode(UserResponse.self, from: data)
        return decoded.points ?? 0
    }
}

// MARK: - Error Handling

enum APIError: LocalizedError {
    case invalidResponse
    case decodingError
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .decodingError:
            return "Failed to decode server response"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

// MARK: - Helpers

enum AnyCodable: Codable {
    case int(Int)
    case string(String)
    case bool(Bool)
    
    var asInt: Int? {
        if case .int(let value) = self { return value }
        if case .string(let value) = self { return Int(value) }
        return nil
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let intValue = try? container.decode(Int.self) {
            self = .int(intValue)
        } else if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else if let boolValue = try? container.decode(Bool.self) {
            self = .bool(boolValue)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode AnyCodable")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch self {
        case .int(let value):
            try container.encode(value)
        case .string(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        }
    }
}

// MARK: - Image Utilities

extension UIImage {
    func toBase64() -> String? {
        guard let imageData = self.jpegData(compressionQuality: 0.8) else {
            return nil
        }
        return imageData.base64EncodedString()
    }
}
