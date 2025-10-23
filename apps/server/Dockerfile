# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .

# Runtime stage - using distroless for minimal image size
FROM gcr.io/distroless/base-debian11

WORKDIR /

# Copy the binary from builder
COPY --from=builder /app/server .

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Set the PORT environment variable (Cloud Run will override this)
ENV PORT=8080

# Run the binary
CMD ["/server"]
