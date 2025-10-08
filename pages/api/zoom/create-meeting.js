import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { topic, start_time, duration } = req.body;

  try {
    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ZOOM_JWT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2, // scheduled meeting
        start_time,
        duration,
        settings: {
          join_before_host: true,
          waiting_room: false,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Zoom API error");

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
