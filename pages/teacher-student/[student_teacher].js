// pages/teacher-student/[student_teacher].js
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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("contracts");

  // 🧩 Split params into studentId and teacherId
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

  // 🧩 Fetch Contracts
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchContracts = async () => {
      try {
        const { data, error } = await supabase
          .from("contracts")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setContracts(data || []);
      } catch (err) {
        console.error("Error fetching contracts:", err.message);
      }
    };
    fetchContracts();
  }, [teacherId, studentId]);

  // 🧩 Fetch Timetable
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchTimetable = async () => {
      try {
        const { data, error } = await supabase
          .from("timetable")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .order("day_of_week", { ascending: true });
        if (error) throw error;
        setTimetable(data || []);
      } catch (err) {
        console.error("Error fetching timetable:", err.message);
      }
    };
    fetchTimetable();
  }, [teacherId, studentId]);

  // 🧩 Fetch Zoom Sessions
  useEffect(() => {
    if (!teacherId || !studentId) return;
    const fetchZoomSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("zoom_sessions")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .order("date", { ascending: false });
        if (error) throw error;
        setZoomSessions(data || []);
      } catch (err) {
        console.error("Error fetching Zoom sessions:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchZoomSessions();
  }, [teacherId, studentId]);

  if (loading)
    return <div className="text-center py-20">Loading teacher data...</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <Banner />
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

      {/* Tabs */}
      <div className="flex gap-3 mt-6">
        {["contracts", "timetable", "zoom"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${
              tab === t ? "bg-sky-600 text-white" : "bg-sky-50"
            }`}
          >
            {t === "contracts"
              ? "Contracts"
              : t === "timetable"
              ? "Timetable"
              : "Zoom Sessions"}
          </button>
        ))}
      </div>

      {/* Contracts */}
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

      {/* Timetable */}
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

      {/* Zoom Sessions */}
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
                  className="flex items-center justify-between bg-gray-50 p-3 rounded shadow-sm"
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
    </div>
  );
}
