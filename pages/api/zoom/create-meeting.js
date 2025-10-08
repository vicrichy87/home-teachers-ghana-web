// pages/api/zoom/create-meeting.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { topic, start_time } = req.body;

  try {
    // Step 1. Get access token
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error || "Failed to get token");

    const accessToken = tokenData.access_token;

    // Step 2. Create meeting
    const meetingRes = await fetch(`https://api.zoom.us/v2/users/me/meetings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time,
        timezone: "Africa/Accra",
        settings: {
          host_video: true,
          participant_video: true,
        },
      }),
    });

    const meetingData = await meetingRes.json();
    if (!meetingRes.ok) throw new Error(meetingData.message || "Failed to create meeting");

    return res.status(200).json(meetingData);
  } catch (err) {
    console.error("Zoom API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
