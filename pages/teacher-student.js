// pages/teacher-student.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Banner from "../components/Banner";

export default function TeacherStudentPage() {
  const router = useRouter();
  const { teacher_id, student_id } = router.query;

  const [relationship, setRelationship] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timetable, setTimetable] = useState([]);
  const [zoomMeetings, setZoomMeetings] = useState([]);
  const [contracts, setContracts] = useState([]);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Fetch teacher-student relationship
  useEffect(() => {
    if (!teacher_id || !student_id) return;
    const fetchData = async () => {
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
            teacher:teacher_id (id, full_name, email, phone, city, profile_image),
            student:student_id (id, full_name, email, phone, city, profile_image)
          `)
          .eq("teacher_id", teacher_id)
          .eq("student_id", student_id)
          .single();

        if (error) throw error;
        setRelationship(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teacher_id, student_id]);

  // Fetch timetable, zoom meetings, contracts
  useEffect(() => {
    if (!teacher_id || !student_id) return;

    const fetchExtraData = async () => {
      // Fetch timetable
      const { data: timetableData } = await supabase
        .from("teacher_student_timetable")
        .select("*")
        .eq("teacher_id", teacher_id)
        .eq("student_id", student_id);

      // Fetch zoom meetings
      const { data: zoomData } = await supabase
        .from("zoom_meetings")
        .select("*")
        .eq("teacher_id", teacher_id)
        .eq("student_id", student_id);

      // Fetch contracts
      const { data: contractsData } = await supabase
        .from("contracts")
        .select("*")
        .eq("teacher_id", teacher_id)
        .eq("student_id", student_id);

      setTimetable(timetableData || []);
      setZoomMeetings(zoomData || []);
      setContracts(contractsData || []);
    };
    fetchExtraData();
  }, [teacher_id, student_id]);

  // Handlers (placeholders for now)
  const handleAddTimetable = async () => {
    alert("Add Timetable coming soon!");
  };
  const handleAddZoom = async () => {
    alert("Schedule Zoom meeting coming soon!");
  };
  const handleUploadContract = async () => {
    alert("Upload Contract feature coming soon!");
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!relationship) return <div className="p-8 text-center">No record found.</div>;

  const { teacher, student, subject, level, date_added, expiry_date } = relationship;

  // Expiry warning
  const isExpiringSoon = (() => {
    const now = new Date();
    const expiry = new Date(expiry_date);
    const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  })();

  return (
    <div className="bg-gray-50 min-h-screen">
      <Banner />

      <div className="max-w-5xl mx-auto bg-white rounded shadow p-6 mt-6">
        <h1 className="text-2xl font-bold text-sky-700 mb-4 text-center">
          Teacher–Student Relationship
        </h1>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Teacher */}
          <div className="bg-sky-50 p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-sky-800 mb-2">Teacher</h2>
            <img
              src={teacher?.profile_image || "/default-avatar.png"}
              alt="Teacher"
              className="w-24 h-24 rounded-full mx-auto mb-2"
            />
            <p className="text-center font-semibold">{teacher?.full_name}</p>
            <p className="text-center text-sm text-gray-600">{teacher?.email}</p>
            <p className="text-center text-sm">{teacher?.city}</p>
          </div>

          {/* Student */}
          <div className="bg-emerald-50 p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-emerald-800 mb-2">Student</h2>
            <img
              src={student?.profile_image || "/default-avatar.png"}
              alt="Student"
              className="w-24 h-24 rounded-full mx-auto mb-2"
            />
            <p className="text-center font-semibold">{student?.full_name}</p>
            <p className="text-center text-sm text-gray-600">{student?.email}</p>
            <p className="text-center text-sm">{student?.city}</p>
          </div>
        </div>

        {/* Relationship Info */}
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
          {isExpiringSoon && (
            <div className="bg-yellow-100 text-yellow-800 p-2 mt-2 rounded">
              ⚠️ This relationship is expiring soon.
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center space-x-3 mb-6">
          {["overview", "timetable", "zoom", "contracts"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded ${
                tab === t
                  ? "bg-sky-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
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

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="text-center text-gray-700">
            <p>
              This page connects <strong>{teacher?.full_name}</strong> and{" "}
              <strong>{student?.full_name}</strong> for{" "}
              <strong>{subject}</strong> ({level}).
            </p>
            <p className="mt-2">
              Use the tabs above to manage lessons, meetings, and contracts.
            </p>
          </div>
        )}

        {tab === "timetable" && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-sky-700">Timetable</h3>
            <button
              onClick={handleAddTimetable}
              className="bg-sky-600 text-white px-3 py-1 rounded mb-3"
            >
              + Add Session
            </button>
            {timetable.length === 0 ? (
              <p>No timetable sessions yet.</p>
            ) : (
              <ul className="space-y-2">
                {timetable.map((item) => (
                  <li
                    key={item.id}
                    className="border p-3 rounded bg-gray-50 flex justify-between"
                  >
                    <span>
                      {item.day} - {item.subject} ({item.start_time} to{" "}
                      {item.end_time})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "zoom" && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-sky-700">
              Zoom Meetings
            </h3>
            <button
              onClick={handleAddZoom}
              className="bg-sky-600 text-white px-3 py-1 rounded mb-3"
            >
              + Schedule Zoom Meeting
            </button>
            {zoomMeetings.length === 0 ? (
              <p>No meetings scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {zoomMeetings.map((z) => (
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
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "contracts" && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-sky-700">Contracts</h3>
            <button
              onClick={handleUploadContract}
              className="bg-sky-600 text-white px-3 py-1 rounded mb-3"
            >
              + Upload Contract
            </button>
            {contracts.length === 0 ? (
              <p>No contracts uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {contracts.map((c) => (
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
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
