const serverStatus = document.getElementById("server-status");
const serverMessage = document.getElementById("server-message");
const locationStatus = document.getElementById("location-status");

function setLocationStatus(message) {
  if (locationStatus) {
    locationStatus.textContent = message;
  }
}

// Check that the frontend can still talk to the backend normally.
async function loadSiteStatus() {
  try {
    const response = await fetch("/api/site-status");

    if (!response.ok) {
      throw new Error("Backend request failed.");
    }

    const data = await response.json();
    serverStatus.textContent = "Connected";
    serverMessage.textContent = data.message;
  } catch (error) {
    serverStatus.textContent = "Unavailable";
    serverMessage.textContent =
      "The frontend could not reach the backend. Check the server console for details.";
    console.error(error);
  }
}

async function sendLocation(latitude, longitude) {
  const response = await fetch("/api/location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lat: latitude,
      lon: longitude,
    }),
  });

  if (!response.ok) {
    throw new Error("Location could not be saved.");
  }
}

// Ask the browser for the user's exact location with normal permission handling.
function requestVisitorLocation() {
  if (!("geolocation" in navigator)) {
    setLocationStatus("Location not supported");
    return;
  }

  setLocationStatus("Requesting location access...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      setLocationStatus("Location access granted");

      try {
        await sendLocation(latitude, longitude);
      } catch (error) {
        setLocationStatus("Location granted, but saving failed");
        console.error(error);
      }
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setLocationStatus("Location access denied");
        return;
      }

      if (error.code === error.TIMEOUT) {
        setLocationStatus("Location request timed out");
        return;
      }

      setLocationStatus("Location unavailable");
      console.error(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  loadSiteStatus();
  requestVisitorLocation();
});
