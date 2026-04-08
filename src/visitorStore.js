const fs = require("fs");
const path = require("path");

const dataDirectory = path.join(__dirname, "..", "data");
const visitorFilePath = path.join(dataDirectory, "visitors.json");

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
    return Array.isArray(visitors) ? visitors : [];
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
  visitors.push(visitor);
  await writeVisitors(visitors);
  return visitor;
}

module.exports = {
  ensureVisitorFile,
  readVisitors,
  appendVisitor,
  visitorFilePath,
};
