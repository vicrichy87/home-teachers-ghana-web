// pages/api/zoom/create-meeting.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { topic, start_time, duration } = req.body;

    // Get OAuth access token
    const zoomToken = process.env.ZOOM_JWT_TOKEN || process.env.ZOOM_SECRET_TOKEN;

    if (!zoomToken) {
      return res.status(500).json({ error: "Zoom token not set" });
    }

    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${zoomToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time, // ISO 8601 format
        duration, // in minutes
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
