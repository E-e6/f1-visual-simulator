const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Optional: simple API endpoint to check server is alive
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", message: "F1 Visual Simulator server running!" });
});

// Serve React build files
app.use(express.static(path.join(__dirname, "build")));

// Fallback for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});