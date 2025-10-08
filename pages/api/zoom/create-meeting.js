// pages/api/zoom/create-meeting.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ZOOM_BEARER = process.env.ZOOM_OAUTH_TOKEN || process.env.ZOOM_JWT_TOKEN; 
// prefer OAuth server-side token (Server-to-Server OAuth or long-lived token).
// If you use Server-to-Server OAuth, periodically refresh token as appropriate.

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase service role key or url missing in environment - API route will fail!");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!ZOOM_BEARER) {
    return res.status(500).json({ error: "Zoom API token missing on server. Set ZOOM_OAUTH_TOKEN or ZOOM_JWT_TOKEN env var." });
  }

  try {
    const { teacher_id, student_id, topic, start_time, duration = 60 } = req.body;

    if (!teacher_id || !student_id || !topic || !start_time) {
      return res.status(400).json({ error: "teacher_id, student_id, topic and start_time are required" });
    }

    // Zoom create meeting — using authenticated user "me"
    const zoomBody = {
      topic,
      type: 2, // scheduled meeting
      start_time, // ISO string e.g. 2025-01-01T12:00:00Z
      duration,
      timezone: "UTC",
      settings: {
        join_before_host: false,
        host_video: false,
        participant_video: false,
      },
    };

    const zoomResp = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ZOOM_BEARER}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zoomBody),
    });

    if (!zoomResp.ok) {
      const errText = await zoomResp.text();
      console.error("Zoom API error:", errText);
      return res.status(500).json({ error: "Failed to create Zoom meeting", details: errText });
    }

    const zoomData = await zoomResp.json();
    // zoomData includes join_url, start_url, id (numeric or uuid depending), start_time etc.

    // Insert into supabase zoom_meetings table (server-side)
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("zoom_meetings")
      .insert([
        {
          teacher_id,
          student_id,
          topic,
          zoom_link: zoomData.join_url || zoomData.start_url || "",
          start_time: zoomData.start_time || start_time,
          meeting_id: String(zoomData.id || zoomData.meeting_number || ""),
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return res.status(500).json({ error: "Failed to save meeting in database", details: insertError });
    }

    return res.status(200).json({ meeting: insertData, zoom: zoomData });
  } catch (err) {
    console.error("create-meeting handler error:", err);
    return res.status(500).json({ error: String(err) });
  }
}
