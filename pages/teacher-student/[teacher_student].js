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

  useEffect(() => {
    if (!router.isReady || !teacherId || !studentId) return;

    const fetchRelationships = async () => {
      try {
        setLoading(true);

        // fetch all teacher-student relationships for this student
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
        setSelectedRelId(data[0].id); // select first subject by default
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [router.isReady, teacherId, studentId]);

  useEffect(() => {
    if (!selectedRelId) return;

    const rel = relationships.find(r => r.id === selectedRelId);
    if (!rel) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // timetable
        const { data: ttData } = await supabase
          .from("teacher_student_timetable")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .eq("subject", rel.subject);

        // zoom meetings
        const { data: zoomData } = await supabase
          .from("zoom_meetings")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .eq("subject", rel.subject);

        // contracts
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

  const selectedRel = relationships.find(r => r.id === selectedRelId);
  if (!selectedRel) return <div className="p-8 text-center">No subject selected.</div>;

  const { teacher, student, subject, level, date_added, expiry_date } = selectedRel;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Banner />    
      <div className="max-w-4xl mx-auto p-6">
   
        {/* Back Button */}
        <button
          onClick={() => router.push("/teacher")} // Go back to teacher page
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
          <p><strong>Subject:</strong> {subject}</p>
          <p><strong>Level:</strong> {level}</p>
          <p><strong>Date Added:</strong> {formatDate(date_added)}</p>
          <p><strong>Expiry Date:</strong> {formatDate(expiry_date)}</p>
        </div>

        {/* Dropdown to select subject */}
        {relationships.length > 1 && (
          <div className="mb-4">
            <label className="font-semibold mr-2">Select Subject: </label>
            <select
              value={selectedRelId}
              onChange={(e) => setSelectedRelId(e.target.value)}
              className="border rounded p-2"
            >
              {relationships.map(r => (
                <option key={r.id} value={r.id}>
                  {r.subject} ({r.level})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
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
          <Section
            title="Timetable"
            data={timetable}
            renderItem={item => (
              <li key={item.id} className="border p-3 rounded bg-gray-50">
                {item.day} - {item.subject} ({item.start_time} to {item.end_time})
              </li>
            )}
          />
        )}

        {tab === "zoom" && (
          <Section
            title="Zoom Meetings"
            data={zoomMeetings}
            renderItem={z => (
              <li key={z.id} className="border p-3 rounded bg-gray-50">
                <a href={z.zoom_link} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                  {z.topic || "Meeting Link"}
                </a> on {formatDate(z.start_time)}
              </li>
            )}
          />
        )}

        {tab === "contracts" && (
          <Section
            title="Contracts"
            data={contracts}
            renderItem={c => (
              <li key={c.id} className="border p-3 rounded bg-gray-50">
                <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                  View Contract
                </a> signed on {formatDate(c.date_signed)}
              </li>
            )}
          />
        )}
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

function Section({ title, data, renderItem }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-sky-700">{title}</h3>
      {(!data || data.length===0)? <p>No {title.toLowerCase()} yet.</p> : <ul className="space-y-2">{data.map(renderItem)}</ul>}
    </div>
  );
}
