// pages/student-teacher/[student_teacher].js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../../components/Banner";

export default function StudentTeacherPage() {
  const router = useRouter();
  const { student_teacher } = router.query;

  const [studentId, setStudentId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [zoomSessions, setZoomSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [selectedSubject, setSelectedSubject] = useState("");

  // 🧩 Split student_teacher param into studentId and teacherId
  useEffect(() => {
    if (!student_teacher) return;
    const [student_id, teacher_id] = student_teacher.split("_");
    setStudentId(student_id);
    setTeacherId(teacher_id);
  }, [student_teacher]);

  // 🧩 Fetch teacher info
  useEffect(() => {
    if (!teacherId) return;
    const fetchTeacher = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, city, profile_image")
        .eq("id", teacherId)
        .single();
      if (!error) setTeacher(data);
    };
    fetchTeacher();
  }, [teacherId]);

  // 🧩 Fetch subjects for dropdown
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from("teacher_students")
        .select("subject, level")
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId);

      if (!error && data) {
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0].subject);
      }
    };
    fetchSubjects();
  }, [teacherId, studentId]);

  // 🧩 Fetch Contracts
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchContracts = async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (!error) setContracts(data || []);
    };
    fetchContracts();
  }, [teacherId, studentId]);

  // 🧩 Fetch Timetable
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchTimetable = async () => {
      const { data, error } = await supabase
        .from("timetable")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId)
        .order("day_of_week", { ascending: true });

      if (!error) setTimetable(data || []);
    };
    fetchTimetable();
  }, [teacherId, studentId]);

  // 🧩 Fetch Zoom Sessions
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchZoom = async () => {
      const { data, error } = await supabase
        .from("zoom_sessions")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      if (!error) setZoomSessions(data || []);
      setLoading(false);
    };
    fetchZoom();
  }, [teacherId, studentId]);

  if (loading) {
    return <div className="text-center py-20">Loading teacher data...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow">
      <Banner />

      {/* Header Info */}
      {teacher && (
        <div className="mt-4 flex gap-4 items-center">
          <img
            src={teacher.profile_image || "/placeholder.png"}
            alt={teacher.full_name}
            className="w-20 h-20 rounded-full border object-cover"
          />
          <div>
            <div className="text-xl font-bold">{teacher.full_name}</div>
            <div className="text-gray-600">
              {teacher.email} | {teacher.phone}
            </div>
            <div className="text-sm text-gray-500">{teacher.city}</div>
          </div>
        </div>
      )}

      {/* Subject Dropdown */}
      {subjects.length > 0 && (
        <div className="mt-4">
          <label className="font-medium text-sm text-gray-700 mr-2">
            Select Subject:
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {subjects.map((s, idx) => (
              <option key={idx} value={s.subject}>
                {s.subject} ({s.level})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 mt-6">
        {["overview", "timetable", "zoom", "contracts"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded font-medium transition ${
              tab === t ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800"
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

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Overview</h3>
          {subjects.length === 0 ? (
            <p className="text-gray-600">No subjects registered yet.</p>
          ) : (
            <ul className="space-y-3">
              {subjects.map((s, idx) => (
                <li
                  key={idx}
                  className="p-4 border rounded bg-gray-50 flex justify-between"
                >
                  <div>
                    <div className="font-medium">{s.subject}</div>
                    <div className="text-sm text-gray-500">
                      Level: {s.level}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Timetable Tab */}
      {tab === "timetable" && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Timetable</h3>
          {timetable.length === 0 ? (
            <p className="text-gray-600">No timetable available yet.</p>
          ) : (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Day</th>
                  <th className="border p-2">Time</th>
                  <th className="border p-2">Subject</th>
                </tr>
              </thead>
              <tbody>
                {timetable.map((t) => (
                  <tr key={t.id}>
                    <td className="border p-2">{t.day_of_week}</td>
                    <td className="border p-2">
                      {t.start_time} - {t.end_time}
                    </td>
                    <td className="border p-2">{t.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Zoom Sessions Tab */}
      {tab === "zoom" && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Zoom Sessions</h3>
          {zoomSessions.length === 0 ? (
            <p className="text-gray-600">No Zoom sessions yet.</p>
          ) : (
            <ul className="space-y-3">
              {zoomSessions.map((z) => (
                <li
                  key={z.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded border"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {z.topic || "Session"} —{" "}
                      {z.date
                        ? new Date(z.date).toLocaleDateString()
                        : "Unknown date"}
                    </div>
                    <a
                      href={z.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 underline text-sm"
                    >
                      Join Zoom
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Contracts Tab */}
      {tab === "contracts" && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Contracts</h3>
          {contracts.length === 0 ? (
            <p className="text-gray-600">No contracts yet.</p>
          ) : (
            <ul className="space-y-3">
              {contracts.map((c) => (
                <li
                  key={c.id}
                  className="p-4 bg-gray-50 rounded border shadow-sm"
                >
                  <div className="font-medium">{c.subject}</div>
                  <div className="text-sm text-gray-500">
                    Rate: GHC {c.rate} | Duration: {c.duration}
                  </div>
                  {c.notes && (
                    <div className="text-sm text-gray-600 mt-1">{c.notes}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    Created: {new Date(c.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
