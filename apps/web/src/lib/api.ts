/**
 * API client for BabelGopher backend server
 */

export interface AuthTokenRequest {
  user_identity: string;
  room_name: string;
}

export interface AuthTokenResponse {
  token: string;
}

export interface ErrorResponse {
  error: string;
}

/**
 * Fetches a LiveKit access token from the backend server
 * @param identity - User identity (name)
 * @param roomName - Room name to join
 * @returns JWT token for LiveKit connection
 * @throws Error if token fetch fails
 */
export async function fetchLiveKitToken(
  identity: string,
  roomName: string
): Promise<string> {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  if (!serverUrl) {
    throw new Error('NEXT_PUBLIC_SERVER_URL environment variable is not configured');
  }

  const requestBody: AuthTokenRequest = {
    user_identity: identity,
    room_name: roomName,
  };

  try {
    const response = await fetch(`${serverUrl}/auth-livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(`Token fetch failed: ${errorData.error}`);
    }

    const data: AuthTokenResponse = await response.json();
    return data.token;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while fetching token');
  }
}
