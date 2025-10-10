// pages/student-teacher/[student_teacher].js
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Banner from "../../components/Banner";

/* ---------- utility ---------- */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function StudentTeacherPage() {
  const router = useRouter();
  const { student_teacher } = router.query;

  // split param "studentid_teacherid"
  const [studentId, teacherId] = (student_teacher && typeof student_teacher === "string")
    ? student_teacher.split("_")
    : [];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relationships, setRelationships] = useState([]);
  const [selectedRelId, setSelectedRelId] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [zoomMeetings, setZoomMeetings] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tab, setTab] = useState("overview");

  // fetch current user id (so we can properly show view-only status if needed)
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setCurrentUserId(data?.user?.id || null);
      } catch (err) {
        console.error("getUser", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch teacher-student relationships (all subjects registered between this teacher & student)
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

  // Helper refreshers (for current selected subject)
  const refreshZoomes = async (teacherIdArg, studentIdArg, subjectArg) => {
    if (!teacherIdArg || !studentIdArg || !subjectArg) return;
    try {
      const { data } = await supabase
        .from("zoom_meetings")
        .select("*")
        .eq("teacher_id", teacherIdArg)
        .eq("student_id", studentIdArg)
        .eq("subject", subjectArg)
        .order("start_time", { ascending: false });
      setZoomMeetings(data || []);
    } catch (err) {
      console.error("refreshZoomes error", err);
    }
  };

  const refreshContracts = async (teacherIdArg, studentIdArg, subjectArg) => {
    if (!teacherIdArg || !studentIdArg || !subjectArg) return;
    try {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("teacher_id", teacherIdArg)
        .eq("student_id", studentIdArg)
        .eq("subject", subjectArg)
        .order("created_at", { ascending: false });
      setContracts(data || []);
    } catch (err) {
      console.error("refreshContracts error", err);
    }
  };

  // When selectedRelId changes, fetch timetable, zoom & contracts for that subject
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
          .eq("subject", rel.subject)
          .order("start_time", { ascending: false });

        const { data: contractsData } = await supabase
          .from("contracts")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("student_id", studentId)
          .eq("subject", rel.subject)
          .order("created_at", { ascending: false });

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

  // Note: student view — this page is view-only for students (no create/edit/delete UI)
  return (
    <div className="bg-gray-50 min-h-screen">
      <Banner />
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.push("/student")}
          className="mb-4 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
        >
          ← Back to Student Page
        </button>

        <div className="max-w-5xl mx-auto bg-white rounded shadow p-6 mt-6">
          <h1 className="text-2xl font-bold text-sky-700 mb-4 text-center">
            Student–Teacher Page
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
              isReadOnly={true} // student view-only
            />
          )}

          {tab === "zoom" && (
            <ZoomSection
              zoomMeetings={zoomMeetings}
              teacherId={teacher.id}
              studentId={student.id}
              subject={subject}
              refreshZoomes={() => refreshZoomes(teacher.id, student.id, subject)}
              isReadOnly={true} // student view-only (no Create)
            />
          )}

          {tab === "contracts" && (
            <ContractsSection
              contracts={contracts}
              teacherId={teacher.id}
              studentId={student.id}
              subject={subject}
              currentUserId={currentUserId}
              refreshContracts={() => refreshContracts(teacher.id, student.id, subject)}
              isReadOnly={true} // student view-only (no Create)
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Reused components (matching teacher-student layout) ---------- */

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
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-4 py-2 rounded ${tab === t ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
        >
          {t === "overview" ? "Overview" : t === "timetable" ? "Timetable" : t === "zoom" ? "Zoom Sessions" : "Contracts"}
        </button>
      ))}
    </div>
  );
}

/* ========== TimetableSection (view-only if isReadOnly true) ========== */
function TimetableSection({ timetable, teacherId, studentId, subject, refreshTimetable, isReadOnly }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate times in 15-minute intervals
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
    if (!timetable || timetable.length === 0) {
      setFormData(defaultForm);
      return;
    }
    const filledForm = { ...defaultForm };
    timetable.forEach((t) => {
      // some tables use `day` or `day_of_week`
      const dayKey = t.day || t.day_of_week;
      if (dayKey) filledForm[dayKey] = { start_time: t.start_time, end_time: t.end_time };
    });
    setFormData(filledForm);
  }, [timetable]);

  const handleChange = (day, field, value) => {
    setFormData((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  // Save & delete are present in teacher's page; here we keep functions but UI will hide them for read-only students
  const handleSave = async () => {
    setLoading(true);
    try {
      for (const [day, timesObj] of Object.entries(formData)) {
        const existing = timetable.find((t) => (t.day || t.day_of_week) === day);
        if (existing) {
          await supabase.from("teacher_student_timetable").update({ start_time: timesObj.start_time, end_time: timesObj.end_time }).eq("id", existing.id);
        } else {
          if (timesObj.start_time || timesObj.end_time) {
            await supabase.from("teacher_student_timetable").insert({ teacher_id: teacherId, student_id: studentId, subject, day, start_time: timesObj.start_time, end_time: timesObj.end_time });
          }
        }
      }
      setShowModal(false);
      await refreshTimetable();
    } catch (err) {
      console.error(err);
      alert("Failed to save timetable: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the timetable for this subject?")) return;
    setLoading(true);
    try {
      await supabase.from("teacher_student_timetable").delete().eq("teacher_id", teacherId).eq("student_id", studentId).eq("subject", subject);
      await refreshTimetable();
      alert("Timetable deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete timetable: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex space-x-4 items-center mb-4">
        {/* For students this is view-only: hide the edit link */}
        {!isReadOnly && (
          <button onClick={() => setShowModal(true)} className="text-sky-700 underline">
            {timetable.length === 0 ? "Create Timetable" : "Edit Timetable"}
          </button>
        )}

        {!isReadOnly && timetable.length > 0 && (
          <button onClick={handleDelete} className="text-red-600 underline">
            Delete Timetable
          </button>
        )}
      </div>

      {timetable.length > 0 ? (
        <ul className="space-y-2">
          {timetable.map((t) => (
            <li key={t.id} className="border p-3 rounded bg-gray-50">
              {(t.day || t.day_of_week)}: {t.start_time} - {t.end_time}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No timetable entries.</p>
      )}

      {/* Modal editing UI is hidden on student view; but kept for completeness */}
      {showModal && !isReadOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-xl w-full">
            <h2 className="text-lg font-bold mb-4">{timetable.length === 0 ? "Create Timetable" : "Edit Timetable"}</h2>

            {Object.keys(formData).map((day) => (
              <div key={day} className="flex items-center space-x-2 mb-2">
                <span className="w-24 font-semibold">{day}</span>

                <select value={formData[day].start_time} onChange={(e) => handleChange(day, "start_time", e.target.value)} className="border rounded p-1">
                  <option value="">Start</option>
                  {times.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>

                <span>-</span>

                <select value={formData[day].end_time} onChange={(e) => handleChange(day, "end_time", e.target.value)} className="border rounded p-1">
                  <option value="">End</option>
                  {times.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </div>
            ))}

            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700">{loading ? "Saving..." : "Save Timetable"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== ZoomSection (isReadOnly hides creation) ========== */
function ZoomSection({ zoomMeetings, teacherId, studentId, subject, refreshZoomes, isReadOnly }) {
  // For student view we only show sessions
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-sky-700">Zoom Meetings</h3>
        {!isReadOnly && (
          <div>
            {/* Teacher-only Add button would be here in teacher page */}
          </div>
        )}
      </div>

      {(!zoomMeetings || zoomMeetings.length === 0) ? (
        <p>No zoom meetings yet.</p>
      ) : (
        <ul className="space-y-2">
          {zoomMeetings.map(z => (
            <li key={z.id} className="border p-3 rounded bg-gray-50 flex justify-between items-center">
              <div>
                <div className="font-semibold">{z.topic}</div>
                <div className="text-sm">Starts: {z.start_time ? new Date(z.start_time).toLocaleString() : (z.date ? `${new Date(z.date).toLocaleDateString()} ${z.time || ""}`: "Unknown")}</div>
              </div>
              <div>
                <a href={z.zoom_link || z.link} target="_blank" rel="noreferrer" className="text-sky-700 underline">Join</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========== ContractsSection (view-only if isReadOnly true) ========== */
function ContractsSection({ contracts, teacherId, studentId, subject, currentUserId, refreshContracts, isReadOnly }) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeContract, setActiveContract] = useState(null);

  const openView = (contract) => {
    setActiveContract(contract);
    setShowViewModal(true);
  };

  const handlePrint = (contract) => {
    try {
      const w = window.open("", "_blank", "width=800,height=1000");
      if (!w) {
        alert("Popup blocked! Please allow popups for this site to print the contract.");
        return;
      }

      const html = `
        <html>
          <head>
            <title>Contract</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
              h1 { text-align: center; }
              .meta { margin-bottom: 20px; }
              .content { margin-top: 20px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <h1>Teaching Services Agreement</h1>
            <div class="meta">
              <p><strong>Subject:</strong> ${contract.subject || ""}</p>
              <p><strong>Created:</strong> ${new Date(contract.created_at).toLocaleString()}</p>
              <p><strong>Expiry:</strong> ${new Date(contract.expiry_date).toLocaleString()}</p>
            </div>
            <div class="content">
              ${contract.content || ""}
            </div>
            <script>
              window.onload = function() {
                setTimeout(() => { window.print(); }, 300);
              };
            </script>
          </body>
        </html>
      `;

      w.document.write(html);
      w.document.close();
    } catch (err) {
      console.error("Print error:", err);
      alert("Failed to open print view. Please check your browser popup settings.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-sky-700">Contracts</h3>
        <div>
          {/* Students cannot create on this page (read-only) */}
        </div>
      </div>

      {(!contracts || contracts.length === 0) ? (
        <p>No contract created yet.</p>
      ) : (
        <ul className="space-y-2">
          {contracts.map(c => (
            <li key={c.id} className="border p-3 rounded bg-gray-50 flex justify-between items-center">
              <div>
                <div className="font-semibold">Contract for {c.subject}</div>
                <div className="text-sm">Created: {c.created_at ? new Date(c.created_at).toLocaleString() : ""}</div>
                <div className="text-sm">Expiry: {c.expiry_date ? new Date(c.expiry_date).toLocaleString() : ""}</div>
                <div className="text-xs mt-1">Teacher accepted: {c.teacher_accept ? "Yes" : "No"} • Student accepted: {c.student_accept ? "Yes" : "No"}</div>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => openView(c)} className="px-3 py-1 bg-gray-200 rounded">View</button>
                <button onClick={() => handlePrint(c)} className="px-3 py-1 bg-green-600 text-white rounded">Print</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* View Modal */}
      {showViewModal && activeContract && (
        <ViewContractModal
          contract={activeContract}
          onClose={() => { setShowViewModal(false); setActiveContract(null); }}
          currentUserId={currentUserId}
          teacherId={teacherId}
          studentId={studentId}
          handlePrint={() => handlePrint(activeContract)}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}

/* ========== ViewContractModal (view-only for students) ========== */
function ViewContractModal({ contract, onClose, currentUserId, teacherId, studentId, handlePrint, isReadOnly }) {
  const isTeacherUser = currentUserId && currentUserId === teacherId;
  const isStudentUser = currentUserId && currentUserId === studentId;

  const teacherName = contract.teacher_name || "Teacher";
  const studentName = contract.student_name || "Student";

  // In student view (isReadOnly true) checkboxes are disabled
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-3xl w-full max-h-[80vh] overflow-auto">
        <h2 className="text-lg font-bold mb-4">Contract</h2>

        <div
          className="mb-4 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: contract.content || "" }}
        />

        <div className="grid grid-cols-2 gap-8 mb-6 border-t border-gray-200 pt-4">
          {/* Teacher side */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!contract.teacher_accept}
              readOnly
              disabled
              className="w-5 h-5 accent-sky-600"
            />
            <span className="text-sm font-medium">
              {teacherName} (Teacher)
            </span>
          </div>

          {/* Student side */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm font-medium">
              {studentName} (Student)
            </span>
            <input
              type="checkbox"
              checked={!!contract.student_accept}
              readOnly
              disabled
              className="w-5 h-5 accent-sky-600"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Expires: {contract.expiry_date ? new Date(contract.expiry_date).toLocaleString() : ""}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePrint(contract)}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ========== TimetableSection ========== */
function TimetableSection({ timetable, teacherId, studentId, subject, refreshTimetable, isReadOnly }) {
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
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!timetable || timetable.length === 0) {
      setFormData(defaultForm);
      return;
    }
    const filledForm = { ...defaultForm };
    timetable.forEach((t) => {
      const dayKey = t.day || t.day_of_week;
      if (dayKey) filledForm[dayKey] = { start_time: t.start_time, end_time: t.end_time };
    });
    setFormData(filledForm);
  }, [timetable]);

  const handleChange = (day, field, value) => {
    setFormData((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-[#E63946] mb-4">Timetable</h3>
      {timetable.length > 0 ? (
        <ul className="space-y-2">
          {timetable.map((t) => (
            <li key={t.id} className="border p-3 rounded shadow bg-[#FFF4CC] flex justify-between">
              <span className="font-semibold">{t.day || t.day_of_week}</span>
              <span>{t.start_time} - {t.end_time}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No timetable entries yet.</p>
      )}
    </div>
  );
}

/* ========== ZoomSection ========== */
function ZoomSection({ zoomMeetings, teacherId, studentId, subject, refreshZoomes, isReadOnly }) {
  return (
    <div>
      <h3 className="text-xl font-bold text-[#E63946] mb-4">Zoom Sessions</h3>
      {(!zoomMeetings || zoomMeetings.length === 0) ? (
        <p className="text-gray-600">No Zoom sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {zoomMeetings.map(z => (
            <li key={z.id} className="border p-3 rounded shadow bg-[#FFF4CC] flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#E63946]">{z.topic}</div>
                <div className="text-sm text-gray-700">
                  {z.start_time ? new Date(z.start_time).toLocaleString() : "Unknown"}
                </div>
              </div>
              <a href={z.zoom_link || z.link} target="_blank" rel="noreferrer" className="px-3 py-1 bg-[#FFD700] text-[#E63946] rounded font-semibold hover:bg-[#FFDD57]">
                Join
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========== ContractsSection ========== */
function ContractsSection({ contracts, teacherId, studentId, subject, currentUserId, refreshContracts, isReadOnly }) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeContract, setActiveContract] = useState(null);

  const openView = (contract) => {
    setActiveContract(contract);
    setShowViewModal(true);
  };

  const handlePrint = (contract) => {
    try {
      const w = window.open("", "_blank", "width=800,height=1000");
      if (!w) return alert("Popup blocked! Allow popups to print.");
      const html = `
        <html>
          <head>
            <title>Contract</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
              h1 { text-align: center; color: #E63946; }
              .meta { margin-bottom: 20px; }
              .content { margin-top: 20px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <h1>Language Agreement</h1>
            <div class="meta">
              <p><strong>Language:</strong> ${contract.subject || ""}</p>
              <p><strong>Created:</strong> ${new Date(contract.created_at).toLocaleString()}</p>
              <p><strong>Expiry:</strong> ${new Date(contract.expiry_date).toLocaleString()}</p>
            </div>
            <div class="content">${contract.content || ""}</div>
            <script>
              window.onload = function() { setTimeout(() => { window.print(); }, 300); }
            </script>
          </body>
        </html>
      `;
      w.document.write(html);
      w.document.close();
    } catch (err) {
      console.error(err);
      alert("Failed to open print view.");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-[#E63946] mb-4">Contracts</h3>
      {(!contracts || contracts.length === 0) ? (
        <p className="text-gray-600">No contracts yet.</p>
      ) : (
        <ul className="space-y-2">
          {contracts.map(c => (
            <li key={c.id} className="border p-3 rounded shadow bg-[#FFF4CC] flex justify-between items-center">
              <div>
                <div className="font-semibold">{c.subject}</div>
                <div className="text-sm text-gray-700">Created: {c.created_at ? new Date(c.created_at).toLocaleString() : ""}</div>
                <div className="text-sm text-gray-700">Expiry: {c.expiry_date ? new Date(c.expiry_date).toLocaleString() : ""}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openView(c)} className="px-3 py-1 bg-[#FFD700] text-[#E63946] rounded font-semibold hover:bg-[#FFDD57]">View</button>
                <button onClick={() => handlePrint(c)} className="px-3 py-1 bg-[#E63946] text-white rounded font-semibold hover:bg-[#D62839]">Print</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showViewModal && activeContract && (
        <ViewContractModal
          contract={activeContract}
          onClose={() => { setShowViewModal(false); setActiveContract(null); }}
          currentUserId={currentUserId}
          teacherId={teacherId}
          studentId={studentId}
          handlePrint={() => handlePrint(activeContract)}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}

