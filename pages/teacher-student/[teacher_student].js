// pages/teacher-student/[teacher_student].js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Banner from "../../components/Banner";

export default function TeacherStudentPage() {
  const router = useRouter();
  const { teacher_student } = router.query;

  const [teacherId, studentId] = teacher_student?.split("~") || [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relationships, setRelationships] = useState([]);
  const [selectedRelId, setSelectedRelId] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [zoomMeetings, setZoomMeetings] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tab, setTab] = useState("overview");

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Fetch teacher-student relationships
  useEffect(() => {
    if (!router.isReady || !teacherId || !studentId) return;

    const fetchRelationships = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("teacher_students")
          .select(`
            id,
            subject,
            level,
            date_added,
            expiry_date,
            teacher:teacher_id (id, full_name, profile_image, email, city),
            student:student_id (id, full_name, profile_image, email, city)
          `)
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId);

        if (error) throw error;
        if (!data || data.length === 0) {
          setError("No teacher-student relationship found.");
          setLoading(false);
          return;
        }

        setRelationships(data);
        setSelectedRelId(data[0].id);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [router.isReady, teacherId, studentId]);

  // Fetch related data for selected subject
  useEffect(() => {
    if (!selectedRelId) return;
    const rel = relationships.find((r) => r.id === selectedRelId);
    if (!rel) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: ttData } = await supabase
          .from("teacher_student_timetable")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .eq("subject", rel.subject);

        const { data: zoomData } = await supabase
          .from("zoom_meetings")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .eq("subject", rel.subject);

        const { data: contractsData } = await supabase
          .from("contracts")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .eq("subject", rel.subject);

        setTimetable(ttData || []);
        setZoomMeetings(zoomData || []);
        setContracts(contractsData || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to fetch related data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRelId, relationships, teacherId, studentId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const selectedRel = relationships.find((r) => r.id === selectedRelId);
  if (!selectedRel) return <div className="p-8 text-center">No subject selected.</div>;

  const { teacher, student, subject, level, date_added, expiry_date } = selectedRel;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Banner />
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.push("/teacher")}
          className="mb-4 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
        >
          ← Back to Teacher Page
        </button>

        <div className="max-w-5xl mx-auto bg-white rounded shadow p-6 mt-6">
          <h1 className="text-2xl font-bold text-sky-700 mb-4 text-center">
            Teacher–Student Relationship
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <ProfileCard user={teacher} role="Teacher" color="sky" />
            <ProfileCard user={student} role="Student" color="emerald" />
          </div>

          <div className="bg-gray-100 p-4 rounded mb-4 text-center">
            <p>
              <strong>Subject:</strong> {subject}
            </p>
            <p>
              <strong>Level:</strong> {level}
            </p>
            <p>
              <strong>Date Added:</strong> {formatDate(date_added)}
            </p>
            <p>
              <strong>Expiry Date:</strong> {formatDate(expiry_date)}
            </p>
          </div>

          {relationships.length > 1 && (
            <div className="mb-4">
              <label className="font-semibold mr-2">Select Subject: </label>
              <select
                value={selectedRelId}
                onChange={(e) => setSelectedRelId(e.target.value)}
                className="border rounded p-2"
              >
                {relationships.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.subject} ({r.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Tabs tab={tab} setTab={setTab} />

          {tab === "overview" && (
            <div className="text-center text-gray-700">
              <p>
                This page connects <strong>{teacher?.full_name}</strong> and{" "}
                <strong>{student?.full_name}</strong> for <strong>{subject}</strong> ({level}).
              </p>
            </div>
          )}

          {tab === "timetable" && (
            <TimetableSection
              timetable={timetable}
              teacherId={teacher.id}
              studentId={student.id}
              subject={subject}
              refreshTimetable={async () => {
                const { data: ttData } = await supabase
                  .from("teacher_student_timetable")
                  .select("*")
                  .eq("teacher_id", teacher.id)
                  .eq("student_id", student.id)
                  .eq("subject", subject);
                setTimetable(ttData || []);
              }}
            />
          )}

          {tab === "zoom" && (
            <div>
              <button
                onClick={handleAddZoom}
                className="mb-4 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
              >
                Add Zoom Session
              </button>
          
              <Section
                title="Zoom Meetings"
                data={zoomMeetings}
                renderItem={(z) => (
                  <li key={z.id} className="border p-3 rounded bg-gray-50">
                    <a
                      href={z.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 underline"
                    >
                      {z.topic || "Meeting Link"}
                    </a>{" "}
                    on {formatDate(z.start_time)}
                  </li>
                )}
              />
            </div>
          )}
          
          {tab === "contracts" && (
            <Section
              title="Contracts"
              data={contracts}
              renderItem={(c) => (
                <li key={c.id} className="border p-3 rounded bg-gray-50">
                  <a
                    href={c.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 underline"
                  >
                    View Contract
                  </a>{" "}
                  signed on {formatDate(c.date_signed)}
                </li>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Components
function ProfileCard({ user, role, color }) {
  if (!user) return null;
  return (
    <div className={`bg-${color}-50 p-4 rounded shadow`}>
      <h2 className={`text-lg font-semibold text-${color}-800 mb-2`}>{role}</h2>
      <img
        src={user.profile_image || "/default-avatar.png"}
        alt={role}
        className="w-24 h-24 rounded-full mx-auto mb-2"
      />
      <p className="text-center font-semibold">{user.full_name}</p>
      <p className="text-center text-sm text-gray-600">{user.email}</p>
      <p className="text-center text-sm">{user.city}</p>
    </div>
  );
}

function Tabs({ tab, setTab }) {
  const tabs = ["overview", "timetable", "zoom", "contracts"];
  return (
    <div className="flex justify-center space-x-3 mb-6">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-4 py-2 rounded ${
            tab === t ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          {t === "overview"
            ? "Overview"
            : t === "timetable"
            ? "Timetable"
            : t === "zoom"
            ? "Zoom Sessions"
            : "Contracts"}
        </button>
      ))}
    </div>
  );
}

function Section({ title, data, renderItem }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-sky-700">{title}</h3>
      {(!data || data.length === 0) ? (
        <p>No {title.toLowerCase()} yet.</p>
      ) : (
        <ul className="space-y-2">{data.map(renderItem)}</ul>
      )}
    </div>
  );
}

// ---------------- Timetable Section ----------------
function TimetableSection({ timetable, teacherId, studentId, subject, refreshTimetable }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      times.push(`${hour}:${minute}`);
    }
  }

  const defaultForm = {
    Monday: { start_time: "", end_time: "" },
    Tuesday: { start_time: "", end_time: "" },
    Wednesday: { start_time: "", end_time: "" },
    Thursday: { start_time: "", end_time: "" },
    Friday: { start_time: "", end_time: "" },
    Saturday: { start_time: "", end_time: "" },
    Sunday: { start_time: "", end_time: "" },
  };

  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    if (timetable.length === 0) return;
    const filledForm = { ...defaultForm };
    timetable.forEach((t) => {
      filledForm[t.day] = { start_time: t.start_time, end_time: t.end_time };
    });
    setFormData(filledForm);
  }, [timetable]);

  const handleChange = (day, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const [day, times] of Object.entries(formData)) {
        const existing = timetable.find((t) => t.day === day);
        if (existing) {
          await supabase
            .from("teacher_student_timetable")
            .update({ start_time: times.start_time, end_time: times.end_time })
            .eq("id", existing.id);
        } else {
          await supabase.from("teacher_student_timetable").insert({
            teacher_id: teacherId,
            student_id: studentId,
            subject,
            day,
            start_time: times.start_time,
            end_time: times.end_time,
          });
        }
      }
      setShowModal(false);
      refreshTimetable();
    } catch (err) {
      console.error(err.message);
      alert("Failed to save timetable: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the timetable for this subject?")) return;
    setLoading(true);
    try {
      await supabase
        .from("teacher_student_timetable")
        .delete()
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId)
        .eq("subject", subject);
      refreshTimetable();
      alert("Timetable deleted successfully.");
    } catch (err) {
      console.error(err.message);
      alert("Failed to delete timetable: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex space-x-4 items-center mb-4">
        <button onClick={() => setShowModal(true)} className="text-sky-700 underline">
          {timetable.length === 0 ? "Create Timetable" : "Edit Timetable"}
        </button>

        {timetable.length > 0 && (
          <button onClick={handleDelete} className="text-red-600 underline" disabled={loading}>
            {loading ? "Deleting..." : "Delete Timetable"}
          </button>
        )}
      </div>

      {timetable.length > 0 && (
        <ul className="space-y-2">
          {timetable.map((t) => (
            <li key={t.id} className="border p-3 rounded bg-gray-50">
              {t.day}: {t.start_time} - {t.end_time}
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-xl w-full">
            <h2 className="text-lg font-bold mb-4">
              {timetable.length === 0 ? "Create Timetable" : "Edit Timetable"}
            </h2>
            {Object.keys(formData).map((day) => (
              <div key={day} className="flex items-center space-x-2 mb-2">
                <span className="w-24 font-semibold">{day}</span>
                <select
                  value={formData[day].start_time}
                  onChange={(e) => handleChange(day, "start_time", e.target.value)}
                  className="border rounded p-1"
                >
                  <option value="">Start</option>
                  {times.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span>-</span>
                <select
                  value={formData[day].end_time}
                  onChange={(e) => handleChange(day, "end_time", e.target.value)}
                  className="border rounded p-1"
                >
                  <option value="">End</option>
                  {times.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700" disabled={loading}>
                {loading ? "Saving..." : "Save Timetable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Zoom Section ----------------
function ZoomSection({ zoomMeetings, setZoomMeetings, teacherId, studentId, subject }) {
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState("");
  const [startTime, setStartTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddZoom = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/create-zoom-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, start_time: startTime }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create Zoom meeting");

      // Save in Supabase
      await supabase.from("zoom_meetings").insert({
        teacher_id: teacherId,
        student_id: studentId,
        subject,
        topic,
        zoom_link: data.meetingLink,
        start_time: startTime,
      });

      // Refresh list
      const { data: zoomData } = await supabase
        .from("zoom_meetings")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId)
        .eq("subject", subject);

      setZoomMeetings(zoomData || []);
      setShowModal(false);
      setTopic("");
      setStartTime("");
    } catch (err) {
      console.error(err);
      alert("Error creating Zoom meeting: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700">
          Add Zoom Session
        </button>
      </div>

      {zoomMeetings.length === 0 ? (
        <p>No Zoom sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {zoomMeetings.map((z) => (
            <li key={z.id} className="border p-3 rounded bg-gray-50">
              <a href={z.zoom_link} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                {z.topic || "Meeting Link"}
              </a>{" "}
              on {new Date(z.start_time).toLocaleString()}
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">Add Zoom Session</h2>
            <div className="mb-2">
              <label className="block font-semibold mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border rounded p-2"
              />
            </div>
            <div className="mb-2">
              <label className="block font-semibold mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border rounded p-2"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={handleAddZoom} className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700" disabled={loading}>
                {loading ? "Creating..." : "Create Zoom"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
