package livekit

import (
	"time"

	"github.com/livekit/protocol/auth"
)

// GenerateToken creates a LiveKit access token for a user to join a room
func GenerateToken(apiKey, apiSecret, roomName, identity string) (string, error) {
	// Create access token with API credentials
	at := auth.NewAccessToken(apiKey, apiSecret)

	// Define video grant permissions
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     roomName,
	}

	// Configure token with grant, identity, and expiration
	at.AddGrant(grant).
		SetIdentity(identity).
		SetValidFor(24 * time.Hour) // 24 hour expiration for hackathon

	// Generate and return JWT token
	return at.ToJWT()
}
