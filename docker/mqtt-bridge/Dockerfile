FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source files
COPY src/services/data-pipeline /app/src/services/data-pipeline
COPY src/lib/logger.ts /app/src/lib/logger.ts
COPY tsconfig.json ./

# Compile TypeScript
RUN npx tsc --project tsconfig.json

# Create health check script
RUN echo '#!/usr/bin/env node\n\
const http = require("http");\n\
http.get("http://localhost:8080/health", (res) => {\n\
  process.exit(res.statusCode === 200 ? 0 : 1);\n\
}).on("error", () => {\n\
  process.exit(1);\n\
});' > /app/healthcheck.js && \
chmod +x /app/healthcheck.js

# Create start script
RUN echo '#!/usr/bin/env node\n\
const { mqttIngestionService } = require("./dist/src/services/data-pipeline/MqttIngestionService");\n\
const http = require("http");\n\
\n\
// Health check server\n\
const healthServer = http.createServer((req, res) => {\n\
  if (req.url === "/health") {\n\
    const metrics = mqttIngestionService.getMetrics();\n\
    res.writeHead(metrics.isRunning ? 200 : 503);\n\
    res.end(JSON.stringify(metrics));\n\
  } else {\n\
    res.writeHead(404);\n\
    res.end();\n\
  }\n\
});\n\
\n\
healthServer.listen(8080, () => {\n\
  console.log("Health check server listening on port 8080");\n\
});\n\
\n\
// Start MQTT ingestion\n\
mqttIngestionService.start()\n\
  .then(() => console.log("MQTT ingestion service started"))\n\
  .catch(err => {\n\
    console.error("Failed to start:", err);\n\
    process.exit(1);\n\
  });\n\
\n\
// Graceful shutdown\n\
process.on("SIGTERM", async () => {\n\
  console.log("SIGTERM received, shutting down...");\n\
  await mqttIngestionService.stop();\n\
  healthServer.close();\n\
  process.exit(0);\n\
});' > /app/start.js && \
chmod +x /app/start.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mqttbridge -u 1001

USER mqttbridge

EXPOSE 8080

CMD ["node", "/app/start.js"]