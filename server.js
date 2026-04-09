const express = require("express");
const path = require("path");
const {
  ensureVisitorFile,
  readVisitors,
  appendVisitor,
  updateLatestVisitorLocation,
} = require("./src/visitorStore");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");

app.use(express.json());

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
function createVisitorRecord(req, location = {}) {
  return {
    ipAddress: getVisitorIp(req),
    timestamp: new Date().toISOString(),
    userAgent: req.get("user-agent") || "Unknown",
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
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

// Serve the rest of the public files after "/" so homepage visits still log.
app.use(express.static(publicDirectory));

// The admin dashboard is served as a separate page.
app.get("/admin", (req, res) => {
  res.sendFile(path.join(publicDirectory, "admin.html"));
});

// Save exact browser coordinates when a visitor grants location access.
app.post("/api/location", async (req, res, next) => {
  const { lat, lon } = req.body || {};
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({
      message: "Latitude and longitude are required numbers.",
    });
  }

  try {
    const visitorIdentity = {
      ipAddress: getVisitorIp(req),
      userAgent: req.get("user-agent") || "Unknown",
      latitude,
      longitude,
    };

    let savedVisitor = await updateLatestVisitorLocation(visitorIdentity);

    // Fall back to a fresh record if there is no visit to merge into yet.
    if (!savedVisitor) {
      savedVisitor = await appendVisitor(
        createVisitorRecord(req, { latitude, longitude })
      );
    }

    res.json({
      message: "Location saved successfully.",
      visitor: savedVisitor,
    });
  } catch (error) {
    next(error);
  }
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
