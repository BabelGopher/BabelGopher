package main

import (
	"log"
	"net/http"
	"os"

	"github.com/babelgopher/server/handler"
)

func main() {
	// Load server port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Load LiveKit configuration
	livekitAPIKey := os.Getenv("LIVEKIT_API_KEY")
	livekitAPISecret := os.Getenv("LIVEKIT_API_SECRET")
	livekitURL := os.Getenv("LIVEKIT_URL")

	// Load CORS configuration
	frontendURL := os.Getenv("FRONTEND_URL")

	// Validate required LiveKit environment variables
	if livekitAPIKey == "" || livekitAPISecret == "" {
		log.Println("WARNING: LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set")
		log.Println("Token generation will fail. Set these environment variables to enable LiveKit authentication.")
	}

	if livekitURL == "" {
		log.Println("INFO: LIVEKIT_URL not set (optional, used by clients)")
	}

	if frontendURL == "" {
		log.Println("WARNING: FRONTEND_URL not set - CORS will allow all origins (*)")
		log.Println("For production, set FRONTEND_URL to your frontend domain (e.g., https://yourdomain.vercel.app)")
	} else {
		log.Printf("INFO: CORS configured for frontend origin: %s", frontendURL)
	}

	// Register routes
	http.HandleFunc("/health", handler.HealthHandler)
	http.HandleFunc("/auth-livekit-token", handler.AuthLiveKitTokenHandler(livekitAPIKey, livekitAPISecret, frontendURL))

	// Start server
	addr := "0.0.0.0:" + port
	log.Printf("Server starting on %s", addr)
	log.Printf("Endpoints available:")
	log.Printf("  GET  /health")
	log.Printf("  POST /auth-livekit-token")

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}
