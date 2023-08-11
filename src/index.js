const app = require("express")();

const requestCounts = new Map();

const apiKeys = {
  Dev: 10,
  Test: 1,
};

const matches = {
  123: {
    test: "test",
  },
  321: {
    test: "test2",
  },
};

function rateLimitMiddleware(req, res, next) {
  const apiKey = req.query.apiKey;
  const now = Date.now();
  const interval = 60000; // 1 minute in milliseconds

  if (!apiKeys.hasOwnProperty(apiKey)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const limit = apiKeys[apiKey];
  const apiKeyData = requestCounts.get(apiKey) || [];
  const requestsWithinInterval = apiKeyData.filter(
    (entry) => now - entry.timestamp < interval
  );

  if (requestsWithinInterval.length >= limit) {
    res.status(429).json({ error: "Rate limit exceeded" });
  } else {
    apiKeyData.push({
      timestamp: now,
      count: requestsWithinInterval.length + 1,
    });
    requestCounts.set(apiKey, apiKeyData);
    next();
  }
}

app.get("/matches/:matchId", rateLimitMiddleware, (req, res) => {
  if (matches.hasOwnProperty(req.params.matchId)) {
    res.json({ matchesId: matches[req.params.matchId] });
  } else {
    res.status(404).json({ error: "Could not find data" });
  }
});

app.use((req, res) => {
  res.status(400).json({ error: "Not found" });
});

process.on("SIGINT", () => {
  // Save requestCounts data to a file or database
  // For example, using the 'fs' module to write to a JSON file:
  const fs = require("fs");
  fs.writeFileSync(
    "requestCounts.json",
    JSON.stringify(Array.from(requestCounts.entries()))
  );

  process.exit(0);
});

app.listen(8778, () => {
  try {
    const savedData = require("../requestCounts.json"); // Load data from file
    savedData.forEach(([apiKey, data]) => {
      requestCounts.set(apiKey, data);
    });
  } catch (error) {
    console.error(error);
  }
  console.log(requestCounts);
  console.log("Server started on port 8778");
});
