// Send an automatic request after page load so the landing page proves
// frontend-to-backend communication beyond the initial HTML response.
document.addEventListener("DOMContentLoaded", async () => {
  const serverStatus = document.getElementById("server-status");
  const serverMessage = document.getElementById("server-message");

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
});
