package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthLiveKitTokenHandler_Success(t *testing.T) {
	// Create handler with test credentials
	handler := AuthLiveKitTokenHandler("test-key", "test-secret")

	// Create valid request
	reqBody := AuthRequest{
		UserIdentity: "test-user",
		RoomName:     "test-room",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/auth-livekit-token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Call handler
	handler(w, req)

	// Check status code
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Check response body
	var resp AuthResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Token should not be empty
	if resp.Token == "" {
		t.Error("expected non-empty token")
	}

	// Check CORS headers
	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Error("expected CORS header to be set")
	}
}

func TestAuthLiveKitTokenHandler_MissingUserIdentity(t *testing.T) {
	handler := AuthLiveKitTokenHandler("test-key", "test-secret")

	// Request missing user_identity
	reqBody := AuthRequest{
		RoomName: "test-room",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/auth-livekit-token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler(w, req)

	// Should return 400 Bad Request
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	// Check error message
	var errResp ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Error != "missing required field: user_identity" {
		t.Errorf("unexpected error message: %s", errResp.Error)
	}
}

func TestAuthLiveKitTokenHandler_MissingRoomName(t *testing.T) {
	handler := AuthLiveKitTokenHandler("test-key", "test-secret")

	// Request missing room_name
	reqBody := AuthRequest{
		UserIdentity: "test-user",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/auth-livekit-token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler(w, req)

	// Should return 400 Bad Request
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	// Check error message
	var errResp ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Error != "missing required field: room_name" {
		t.Errorf("unexpected error message: %s", errResp.Error)
	}
}

func TestAuthLiveKitTokenHandler_InvalidJSON(t *testing.T) {
	handler := AuthLiveKitTokenHandler("test-key", "test-secret")

	// Send invalid JSON
	req := httptest.NewRequest("POST", "/auth-livekit-token", bytes.NewReader([]byte("{invalid json}")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler(w, req)

	// Should return 400 Bad Request
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestAuthLiveKitTokenHandler_MethodNotAllowed(t *testing.T) {
	handler := AuthLiveKitTokenHandler("test-key", "test-secret")

	// Send GET request (should only accept POST)
	req := httptest.NewRequest("GET", "/auth-livekit-token", nil)
	w := httptest.NewRecorder()

	handler(w, req)

	// Should return 405 Method Not Allowed
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", w.Code)
	}
}

func TestAuthLiveKitTokenHandler_OptionsRequest(t *testing.T) {
	handler := AuthLiveKitTokenHandler("test-key", "test-secret")

	// Send OPTIONS request for CORS preflight
	req := httptest.NewRequest("OPTIONS", "/auth-livekit-token", nil)
	w := httptest.NewRecorder()

	handler(w, req)

	// Should return 200 OK for preflight
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200 for OPTIONS, got %d", w.Code)
	}

	// Check CORS headers are present
	if w.Header().Get("Access-Control-Allow-Origin") == "" {
		t.Error("expected CORS headers on OPTIONS request")
	}
}
