import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Banner from "../../components/Banner";

export default function TeacherStudentPage() {
  const router = useRouter();
  const { "teacher-student": teacher_student } = router.query;

  const [teacherId, setTeacherId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [relationships, setRelationships] = useState([]); // multiple rows
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timetable, setTimetable] = useState([]);
  const [zoomMeetings, setZoomMeetings] = useState([]);
  const [contracts, setContracts] = useState([]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (!router.isReady || !teacher_student) return;

    const [tId, sId] = teacher_student.split("~"); // <-- split using ~
    if (!tId || !sId) {
      setError("Invalid route parameters.");
      setLoading(false);
      return;
    }
    setTeacherId(tId);
    setStudentId(sId);

    const fetchAll = async () => {
      try {
        setLoading(true);

        // fetch all teacher-student relationships (array)
        const { data: relData, error: relError } = await supabase
          .from("teacher_students")
          .select(`
            id, subject, level, date_added, expiry_date,
            teacher:teacher_id (id, full_name, profile_image, email, city),
            student:student_id (id, full_name, profile_image, email, city)
          `)
          .eq("teacher_id", tId)
          .eq("student_id", sId);

        if (relError) throw relError;

        if (!relData || relData.length === 0) {
          setError("No relationship found.");
          setLoading(false);
          return;
        }

        setRelationships(relData);

        // optionally fetch timetable, zoom, contracts for first relationship
        const firstRel = relData[0];

        const [{ data: timetableData }, { data: zoomData }, { data: contractsData }] = await Promise.all([
          supabase
            .from("teacher_student_timetable")
            .select("*")
            .eq("teacher_id", tId)
            .eq("student_id", sId),
          supabase
            .from("zoom_meetings")
            .select("*")
            .eq("teacher_id", tId)
            .eq("student_id", sId),
          supabase
            .from("contracts")
            .select("*")
            .eq("teacher_id", tId)
            .eq("student_id", sId),
        ]);

        setTimetable(timetableData || []);
        setZoomMeetings(zoomData || []);
        setContracts(contractsData || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [router.isReady, teacher_student]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Banner />
      <div className="max-w-5xl mx-auto bg-white rounded shadow p-6 mt-6">
        <h1 className="text-2xl font-bold text-sky-700 mb-4 text-center">
          Teacher–Student Relationship
        </h1>

        {relationships.map((rel) => {
          const { teacher, student, subject, level, date_added, expiry_date, id } = rel;
          const isExpiringSoon = (() => {
            const now = new Date();
            const expiry = new Date(expiry_date);
            return (expiry - now) / (1000 * 60 * 60 * 24) <= 7;
          })();

          return (
            <div key={id} className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <ProfileCard user={teacher} role="Teacher" color="sky" />
                <ProfileCard user={student} role="Student" color="emerald" />
              </div>

              <div className="bg-gray-100 p-4 rounded mb-4 text-center">
                <p><strong>Subject:</strong> {subject}</p>
                <p><strong>Level:</strong> {level}</p>
                <p><strong>Date Added:</strong> {formatDate(date_added)}</p>
                <p><strong>Expiry Date:</strong> {formatDate(expiry_date)}</p>
                {isExpiringSoon && <div className="bg-yellow-100 text-yellow-800 p-2 mt-2 rounded">⚠️ This relationship is expiring soon.</div>}
              </div>
            </div>
          );
        })}

        <Tabs tab={tab} setTab={setTab} />

        {tab === "overview" && (
          <div className="text-center text-gray-700">
            <p>
              This page connects <strong>{relationships[0]?.teacher?.full_name}</strong> and{" "}
              <strong>{relationships[0]?.student?.full_name}</strong>.
            </p>
          </div>
        )}

        {tab === "timetable" && <Section title="Timetable" buttonText="+ Add Session" onClick={() => alert("Add Timetable coming soon!")} data={timetable} renderItem={item => <li key={item.id} className="border p-3 rounded bg-gray-50">{item.day} - {item.subject} ({item.start_time} to {item.end_time})</li>} />}

        {tab === "zoom" && <Section title="Zoom Meetings" buttonText="+ Schedule Zoom Meeting" onClick={() => alert("Schedule Zoom meeting coming soon!")} data={zoomMeetings} renderItem={z => <li key={z.id} className="border p-3 rounded bg-gray-50"><a href={z.zoom_link} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">{z.topic || "Meeting Link"}</a> on {formatDate(z.start_time)}</li>} />}

        {tab === "contracts" && <Section title="Contracts" buttonText="+ Upload Contract" onClick={() => alert("Upload Contract coming soon!")} data={contracts} renderItem={c => <li key={c.id} className="border p-3 rounded bg-gray-50"><a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">View Contract</a> signed on {formatDate(c.date_signed)}</li>} />}
      </div>
    </div>
  );
}

function ProfileCard({ user, role, color }) {
  if (!user) return null;
  return (
    <div className={`bg-${color}-50 p-4 rounded shadow`}>
      <h2 className={`text-lg font-semibold text-${color}-800 mb-2`}>{role}</h2>
      <img src={user.profile_image || "/default-avatar.png"} alt={role} className="w-24 h-24 rounded-full mx-auto mb-2" />
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
      {tabs.map(t => (
        <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded ${tab===t?"bg-sky-600 text-white":"bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>
          {t==="overview"?"Overview":t==="timetable"?"Timetable":t==="zoom"?"Zoom Sessions":"Contracts"}
        </button>
      ))}
    </div>
  );
}

function Section({ title, buttonText, onClick, data, renderItem }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-sky-700">{title}</h3>
      <button onClick={onClick} className="bg-sky-600 text-white px-3 py-1 rounded mb-3">{buttonText}</button>
      {(!data || data.length===0)? <p>No {title.toLowerCase()} yet.</p> : <ul className="space-y-2">{data.map(renderItem)}</ul>}
    </div>
  );
}
