const tableBody = document.getElementById("visitor-table-body");
const visitorCount = document.getElementById("visitor-count");
const adminStatus = document.getElementById("admin-status");
const refreshButton = document.getElementById("refresh-button");

function formatTimestamp(timestamp) {
  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return timestamp || "Unknown";
  }

  return parsedDate.toLocaleString();
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function formatCoordinate(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Not allowed";
  }

  return numericValue.toFixed(6);
}

function renderEmptyState(message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 5;
  cell.textContent = message;
  row.appendChild(cell);

  tableBody.replaceChildren(row);
}

// Render the newest visits first so recent activity is easy to see.
function renderVisitors(visitors) {
  if (!Array.isArray(visitors) || visitors.length === 0) {
    visitorCount.textContent = "0 visitors recorded";
    renderEmptyState("No visitors have been logged yet.");
    return;
  }

  const sortedVisitors = [...visitors].sort((first, second) => {
    return new Date(second.timestamp) - new Date(first.timestamp);
  });

  visitorCount.textContent = `${sortedVisitors.length} visitors recorded`;
  tableBody.replaceChildren();

  sortedVisitors.forEach((visitor) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(visitor.ipAddress || "Unknown"));
    row.appendChild(createCell(formatTimestamp(visitor.timestamp)));
    row.appendChild(createCell(visitor.userAgent || "Unknown"));
    row.appendChild(createCell(formatCoordinate(visitor.latitude)));
    row.appendChild(createCell(formatCoordinate(visitor.longitude)));

    tableBody.appendChild(row);
  });
}

async function loadVisitors() {
  adminStatus.textContent = "Loading visitor data...";
  refreshButton.disabled = true;

  try {
    const response = await fetch("/visitors");

    if (!response.ok) {
      throw new Error("Could not load visitor data.");
    }

    const visitors = await response.json();
    renderVisitors(visitors);
    adminStatus.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    renderEmptyState("Unable to load visitor data right now.");
    adminStatus.textContent = "Failed to load visitor data.";
    console.error(error);
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadVisitors);
document.addEventListener("DOMContentLoaded", loadVisitors);
