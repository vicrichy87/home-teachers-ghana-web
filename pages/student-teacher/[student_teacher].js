// pages/student-teacher/[student_teacher].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Banner from "../../components/Banner";

export default function StudentTeacherPage() {
  const router = useRouter();
  const { student_teacher } = router.query;

  const [studentId, setStudentId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [contracts, setContracts] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [zoomSessions, setZoomSessions] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Split the combined param (student_teacher = "studentid_teacherid")
  useEffect(() => {
    if (!student_teacher) return;
    const [student_id, teacher_id] = student_teacher.split("_");
    setStudentId(student_id);
    setTeacherId(teacher_id);
  }, [student_teacher]);

  // Fetch teacher info
  useEffect(() => {
    if (!teacherId) return;
    const fetchTeacher = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, city, profile_image, bio")
        .eq("id", teacherId)
        .single();
      if (!error) setTeacher(data);
    };
    fetchTeacher();
  }, [teacherId]);

  // Fetch subjects (teacher_students table)
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from("teacher_students")
        .select("id, subject, level")
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId);
      if (!error && data?.length > 0) {
        setSubjects(data);
        setSelectedSubject(data[0].subject);
      }
    };
    fetchSubjects();
  }, [teacherId, studentId]);

  // Fetch contracts
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

  // Fetch timetable
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

  // Fetch Zoom sessions
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

  if (loading)
    return <div className="text-center py-20">Loading teacher data...</div>;

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-sm">
      <Banner />
      {/* Teacher Header */}
      {teacher && (
        <div className="flex items-center gap-4 mt-4">
          <img
            src={teacher.profile_image || "/placeholder.png"}
            alt={teacher.full_name}
            className="w-20 h-20 rounded-full border object-cover"
          />
          <div>
            <h2 className="text-2xl font-semibold">{teacher.full_name}</h2>
            <p className="text-sm text-gray-600">
              {teacher.email} | {teacher.phone}
            </p>
            <p className="text-sm text-gray-500">{teacher.city}</p>
          </div>
        </div>
      )}

      {/* Subject Dropdown */}
      {subjects.length > 1 && (
        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700 mr-2">
            Select Subject:
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.subject}>
                {s.subject} ({s.level})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3 mt-6 border-b pb-2">
        {["overview", "timetable", "zoom", "contracts"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              tab === t
                ? "bg-sky-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-sky-50"
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

      {/* Overview */}
      {tab === "overview" && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">
            Overview — {selectedSubject}
          </h3>
          <p className="text-gray-700">
            Below you can view your scheduled classes, Zoom sessions, and active
            contracts for this teacher.
          </p>
        </div>
      )}

      {/* Timetable */}
      {tab === "timetable" && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">
            Timetable — {selectedSubject}
          </h3>
          {timetable.length === 0 ? (
            <p className="text-gray-600">No timetable found.</p>
          ) : (
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Day</th>
                  <th className="border p-2">Time</th>
                  <th className="border p-2">Subject</th>
                </tr>
              </thead>
              <tbody>
                {timetable
                  .filter((t) => t.subject === selectedSubject)
                  .map((t) => (
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

      {/* Zoom Sessions */}
      {tab === "zoom" && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">
            Zoom Sessions — {selectedSubject}
          </h3>
          {zoomSessions.filter((z) => z.subject === selectedSubject).length ===
          0 ? (
            <p className="text-gray-600">No Zoom sessions available yet.</p>
          ) : (
            <ul className="space-y-3">
              {zoomSessions
                .filter((z) => z.subject === selectedSubject)
                .map((z) => (
                  <li
                    key={z.id}
                    className="p-4 bg-gray-50 border rounded flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {z.topic || "Session"} —{" "}
                        {z.date
                          ? new Date(z.date).toLocaleDateString()
                          : "No date"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {z.time || ""}
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

      {/* Contracts */}
      {tab === "contracts" && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">
            Contracts — {selectedSubject}
          </h3>
          {contracts.filter((c) => c.subject === selectedSubject).length === 0 ? (
            <p className="text-gray-600">No contracts found.</p>
          ) : (
            <ul className="space-y-3">
              {contracts
                .filter((c) => c.subject === selectedSubject)
                .map((c) => (
                  <li
                    key={c.id}
                    className="p-4 bg-gray-50 border rounded shadow-sm"
                  >
                    <div className="font-medium">{c.subject}</div>
                    <div className="text-sm text-gray-500">
                      Rate: GHC {c.rate} | Duration: {c.duration}
                    </div>
                    {c.notes && (
                      <div className="text-sm text-gray-600 mt-1">
                        {c.notes}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Created:{" "}
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
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
