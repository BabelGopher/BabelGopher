import type { NextApiRequest, NextApiResponse } from "next";
import { AccessToken } from "livekit-server-sdk";

// In-memory rate limiting
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(
  ip: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // New window or expired record
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  record.count++;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get client IP address (supports proxies)
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown";

  // Apply rate limiting: 10 requests per minute per IP
  if (!checkRateLimit(ip)) {
    console.warn(`[Rate Limit] Blocked request from ${ip}`);
    return res.status(429).json({
      error: "Too many requests. Please try again in a minute.",
    });
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { roomName, participantName } = req.query;

  // Type validation
  if (!roomName || typeof roomName !== "string") {
    return res.status(400).json({ error: "Room name is required" });
  }

  if (!participantName || typeof participantName !== "string") {
    return res.status(400).json({ error: "Participant name is required" });
  }

  // Length validation (prevent DoS with very long strings)
  if (roomName.length > 50) {
    return res
      .status(400)
      .json({ error: "Room name must be 50 characters or less" });
  }

  if (participantName.length > 100) {
    return res
      .status(400)
      .json({ error: "Participant name must be 100 characters or less" });
  }

  if (roomName.length < 1 || participantName.length < 1) {
    return res
      .status(400)
      .json({ error: "Room name and participant name cannot be empty" });
  }

  // Character validation (allow letters/numbers in any language, hyphens, underscores, spaces)
  // Use Unicode property escapes to support names like "한글", "日本語", etc.
  // This prevents XSS while being user-friendly for non-Latin scripts.
  const validNamePattern = /^[\p{L}\p{N}\s\-_]+$/u;

  if (!validNamePattern.test(roomName)) {
    return res.status(400).json({
      error:
        "Room name contains invalid characters. Only alphanumeric, spaces, hyphens, and underscores are allowed.",
    });
  }

  if (!validNamePattern.test(participantName)) {
    return res.status(400).json({
      error:
        "Participant name contains invalid characters. Only alphanumeric, spaces, hyphens, and underscores are allowed.",
    });
  }

  // Sanitize: Trim whitespace
  const sanitizedRoomName = roomName.trim();
  const sanitizedParticipantName = participantName.trim();

  // Check environment variables
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("Missing LiveKit credentials in environment variables");
    return res.status(500).json({
      error:
        "LiveKit not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.",
    });
  }

  const livekitUrl = process.env.LIVEKIT_URL;
  if (!livekitUrl) {
    console.error("Missing LIVEKIT_URL in environment variables");
    return res.status(500).json({
      error:
        "LiveKit not configured. Please set LIVEKIT_URL environment variable.",
    });
  }

  try {
    // Create access token using sanitized inputs
    const token = new AccessToken(apiKey, apiSecret, {
      identity: sanitizedParticipantName,
      // Token valid for 24 hours
      ttl: "24h",
    });

    // Grant permissions
    token.addGrant({
      roomJoin: true,
      room: sanitizedRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT
    const jwt = await token.toJwt();

    return res.status(200).json({
      token: jwt,
      url: livekitUrl,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return res.status(500).json({
      error: "Failed to generate access token",
    });
  }
}
