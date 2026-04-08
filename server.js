const express = require("express");
const path = require("path");
const {
  ensureVisitorFile,
  readVisitors,
  appendVisitor,
} = require("./src/visitorStore");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");

// Serve CSS, JS, and image assets without letting Express auto-handle "/".
app.use(express.static(publicDirectory, { index: false }));

// Pull the real client IP from a proxy header when available.
function getVisitorIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].split(",")[0].trim();
  }

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "Unknown";
}

// Build the object that will be stored in visitors.json.
function createVisitorRecord(req) {
  return {
    ipAddress: getVisitorIp(req),
    timestamp: new Date().toISOString(),
    userAgent: req.get("user-agent") || "Unknown",
  };
}

// Log the visit and then send the landing page HTML.
app.get("/", async (req, res, next) => {
  try {
    await appendVisitor(createVisitorRecord(req));
    res.sendFile(path.join(publicDirectory, "index.html"));
  } catch (error) {
    next(error);
  }
});

// The admin dashboard is served as a separate page.
app.get("/admin", (req, res) => {
  res.sendFile(path.join(publicDirectory, "admin.html"));
});

// This lightweight endpoint confirms the frontend can reach the backend.
app.get("/api/site-status", (req, res) => {
  res.json({
    status: "ok",
    message: "Frontend connected successfully and the homepage visit was logged.",
  });
});

// Return every stored visitor record as JSON for the admin page.
app.get("/visitors", async (req, res, next) => {
  try {
    const visitors = await readVisitors();
    res.json(visitors);
  } catch (error) {
    next(error);
  }
});

// Centralized error handler keeps server responses consistent.
app.use((error, req, res, next) => {
  console.error("Unexpected server error:", error);
  res.status(500).json({
    message: "Something went wrong while handling the request.",
  });
});

ensureVisitorFile()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to prepare visitor storage:", error);
    process.exit(1);
  });
