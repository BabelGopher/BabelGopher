package livekit

import (
	"testing"
)

func TestGenerateToken(t *testing.T) {
	// Test with mock credentials
	apiKey := "test-api-key"
	apiSecret := "test-api-secret"
	roomName := "test-room"
	identity := "test-user"

	token, err := GenerateToken(apiKey, apiSecret, roomName, identity)

	// Should not error with valid inputs
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Token should not be empty
	if token == "" {
		t.Error("expected non-empty token")
	}

	// Token should be a JWT format (contains two dots)
	dotCount := 0
	for _, char := range token {
		if char == '.' {
			dotCount++
		}
	}
	if dotCount != 2 {
		t.Errorf("expected JWT format with 2 dots, got %d dots in token: %s", dotCount, token)
	}
}

func TestGenerateToken_EmptyFields(t *testing.T) {
	tests := []struct {
		name      string
		apiKey    string
		apiSecret string
		roomName  string
		identity  string
	}{
		{"empty api key", "", "secret", "room", "user"},
		{"empty api secret", "key", "", "room", "user"},
		{"empty room name", "key", "secret", "", "user"},
		{"empty identity", "key", "secret", "room", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GenerateToken(tt.apiKey, tt.apiSecret, tt.roomName, tt.identity)

			// Token should still be generated (LiveKit SDK doesn't validate emptiness)
			// but we want to ensure it doesn't panic
			if err != nil {
				t.Logf("Token generation with %s resulted in error: %v", tt.name, err)
			}

			// Just ensure we don't panic and get some token back
			if token == "" && err == nil {
				t.Errorf("expected either token or error for %s", tt.name)
			}
		})
	}
}
