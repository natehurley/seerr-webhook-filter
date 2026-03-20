const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ENV CONFIG
const JELLYFIN_URL = process.env.JELLYFIN_URL;
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;

// AXIOS INSTANCE (preconfigured)
const client = axios.create({
  baseURL: JELLYFIN_URL,
  headers: {
    "Content-Type": "application/json",
    "Authorization": `MediaBrowser Token="${JELLYFIN_API_KEY}"`
  },
  timeout: 5000
});

// SEND NOTIFICATION
async function sendNotification(payload) {
  try {
    await client.post("", [payload]); // Streamyfin expects array
    console.log("✅ Sent:", payload.title);
  } catch (err) {
    console.error("❌ Send failed:", err.message);
  }
}

// FORMATTERS (keeps things clean)
function clean(str) {
  if (!str || str === "null" || str === "undefined") return "";
  return str;
}

// MAIN WEBHOOK
app.post("/webhook", async (req, res) => {
  const data = req.body;

  const event = data.event;
  const subject = clean(data.subject) || "Unknown Media";
  const message = clean(data.message);

  const userId = data.request?.requestedBy_jellyfinUserId;
  const username = data.request?.requestedBy_username;

  console.log("📩 Received:", data);
  console.log("📩 Event:", event);

  // =========================
  // ADMIN EVENTS
  // =========================
  if (
    event === "MEDIA_PENDING" ||
    event === "MEDIA_FAILED" ||
    event === "ISSUE_CREATED" ||
    event === "ISSUE_COMMENT"
  ) {
    let body = subject;

    if (event === "ISSUE_COMMENT" && data.comment?.comment_message) {
      body = `${subject} — ${data.comment.comment_message}`;
    } else if (message) {
      body = `${subject} — ${message}`;
    }

    await sendNotification({
      title: event.replace(/_/g, " "),
      body,
      isAdmin: true
    });
  }

  // =========================
  // USER EVENTS
  // =========================
  if (userId || username) {
    let target = {};
    if (userId) target.userId = userId;
    else target.username = username;

    if (event === "MEDIA_APPROVED") {
      await sendNotification({
        title: "Request Approved",
        body: `${subject} was approved`,
        ...target
      });
    }

    if (event === "MEDIA_DECLINED") {
      await sendNotification({
        title: "Request Declined",
        body: `${subject} was declined`,
        ...target
      });
    }

    if (event === "MEDIA_AVAILABLE") {
      await sendNotification({
        title: "Now Available",
        body: `${subject} is now available`,
        ...target
      });
    }
  } else {
    console.warn("⚠️ No userId/username found for user event");
  }

  res.sendStatus(200);
});

// HEALTH CHECK (optional but useful)
app.get("/", (req, res) => {
  res.send("Seerr Webhook OK");
});

app.listen(3456, () => {
  console.log("🚀 Webhook server running on port 3000");
});
