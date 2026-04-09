const fs = require("fs");
const path = require("path");

const dataDirectory = path.join(__dirname, "..", "data");
const visitorFilePath = path.join(dataDirectory, "visitors.json");

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeVisitor(visitor = {}) {
  return {
    ipAddress: visitor.ipAddress || "Unknown",
    timestamp: visitor.timestamp || new Date().toISOString(),
    userAgent: visitor.userAgent || "Unknown",
    latitude: normalizeCoordinate(visitor.latitude),
    longitude: normalizeCoordinate(visitor.longitude),
  };
}

// Create the data directory and default JSON file on first run.
async function ensureVisitorFile() {
  await fs.promises.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.promises.access(visitorFilePath);
  } catch (error) {
    await fs.promises.writeFile(visitorFilePath, "[]", "utf8");
  }
}

// Read and parse every saved visitor record.
async function readVisitors() {
  await ensureVisitorFile();
  const fileContents = await fs.promises.readFile(visitorFilePath, "utf8");

  try {
    const visitors = JSON.parse(fileContents);
    return Array.isArray(visitors) ? visitors.map(normalizeVisitor) : [];
  } catch (error) {
    return [];
  }
}

// Overwrite the JSON file with a formatted array for easier inspection.
async function writeVisitors(visitors) {
  await ensureVisitorFile();
  await fs.promises.writeFile(
    visitorFilePath,
    JSON.stringify(visitors, null, 2),
    "utf8"
  );
}

// Append the newest visitor to the existing list.
async function appendVisitor(visitor) {
  const visitors = await readVisitors();
  const normalizedVisitor = normalizeVisitor(visitor);

  visitors.push(normalizedVisitor);
  await writeVisitors(visitors);
  return normalizedVisitor;
}

// Attach GPS coordinates to the newest matching visit record.
async function updateLatestVisitorLocation({
  ipAddress,
  userAgent,
  latitude,
  longitude,
}) {
  const visitors = await readVisitors();
  let matchingVisitorIndex = -1;

  for (let index = visitors.length - 1; index >= 0; index -= 1) {
    const visitor = visitors[index];
    const sameVisitor =
      visitor.ipAddress === ipAddress && visitor.userAgent === userAgent;

    if (!sameVisitor) {
      continue;
    }

    if (matchingVisitorIndex === -1) {
      matchingVisitorIndex = index;
    }

    if (visitor.latitude === null || visitor.longitude === null) {
      matchingVisitorIndex = index;
      break;
    }
  }

  if (matchingVisitorIndex === -1) {
    return null;
  }

  visitors[matchingVisitorIndex] = {
    ...visitors[matchingVisitorIndex],
    latitude: normalizeCoordinate(latitude),
    longitude: normalizeCoordinate(longitude),
  };

  await writeVisitors(visitors);
  return visitors[matchingVisitorIndex];
}

module.exports = {
  ensureVisitorFile,
  readVisitors,
  appendVisitor,
  updateLatestVisitorLocation,
  visitorFilePath,
};
