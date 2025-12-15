const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Optional API endpoint
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", message: "F1 Visual Simulator server running!" });
});

// Serve React build
app.use(express.static(path.join(__dirname, "build")));

// Always return index.html for React Router routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
