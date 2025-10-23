package handler

import (
	"encoding/json"
	"net/http"

	"github.com/babelgopher/server/livekit"
)

// AuthRequest represents the request body for /auth-livekit-token
type AuthRequest struct {
	UserIdentity string `json:"user_identity"`
	RoomName     string `json:"room_name"`
}

// AuthResponse represents the success response with token
type AuthResponse struct {
	Token string `json:"token"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// AuthLiveKitTokenHandler handles POST /auth-livekit-token requests
// apiKey, apiSecret, frontendURL should be passed from main via closure or config struct
func AuthLiveKitTokenHandler(apiKey, apiSecret, frontendURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for frontend access
		// Use specific frontend origin instead of wildcard for security
		origin := frontendURL
		if origin == "" {
			origin = "*" // Fallback to wildcard for local development only
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Content-Type", "application/json")

		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Only accept POST requests
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error: "method not allowed, use POST",
			})
			return
		}

		// Parse JSON request body
		var req AuthRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error: "invalid JSON body: " + err.Error(),
			})
			return
		}

		// Validate required fields
		if req.UserIdentity == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error: "missing required field: user_identity",
			})
			return
		}

		if req.RoomName == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error: "missing required field: room_name",
			})
			return
		}

		// Generate LiveKit token
		token, err := livekit.GenerateToken(apiKey, apiSecret, req.RoomName, req.UserIdentity)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error: "failed to generate token: " + err.Error(),
			})
			return
		}

		// Return success response with token
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(AuthResponse{
			Token: token,
		})
	}
}
