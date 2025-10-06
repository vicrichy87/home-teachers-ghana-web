// pages/student.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../components/Banner";

export default function StudentPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  
  // Teacher search + management
  const [teachers, setTeachers] = useState([]);
  const [myTeachers, setMyTeachers] = useState([]);

   // Search fields
  const [searchLocation, setSearchLocation] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchLevel, setSearchLevel] = useState("");
  const [uploading, setUploading] = useState(false);

  // Requests state
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestForm, setRequestForm] = useState({ request_text: "" });
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequestApplications, setSelectedRequestApplications] = useState([]);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);


  useEffect(() => {
    fetchStudentProfile();
  }, []);

  useEffect(() => {
    if (tab === "myTeachers" && student) fetchMyTeachers();
  }, [tab, student]);

  useEffect(() => {
    if (student && tab === "requests") fetchRequests();
  }, [student, tab]);

  useEffect(() => {
    if (tab === "requests" && student) {
      fetchRequests();
    }
  }, [tab, student]);

  // 🌍 Auto-detect location from IP
  useEffect(() => {
    async function detectLocation() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data && data.city) {
          setSearchLocation(data.city);
        }
      } catch (err) {
        console.error("Location detect error:", err);
      }
    }
    detectLocation();
  }, []);

  // 🔹 Fetch student profile
  async function fetchStudentProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      setStudent(data);
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Fetch My Teachers
  async function fetchMyTeachers() {
    try {
      const { data, error } = await supabase
        .from("teacher_students")
        .select(`
          id,
          date_added,
          expiry_date,
          subject,
          level,
          teacher:teacher_id (
            id, full_name, email, phone, city, profile_image
          )
        `)
        .eq("student_id", student.id);
      if (error) throw error;
      setMyTeachers(data || []);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  // 🔹 Requests functions
  async function fetchRequests() {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from("requests")
        .select("id, request_text, city, status, created_at")
        .eq("user_id", student.id)  // ✅ only fetch requests created by this student
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
      setFilteredRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      alert(err.message || String(err));
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleCreateRequest() {
    if (!requestForm.request_text) return alert("Please enter request text");
    try {
      const { error } = await supabase
        .from("requests")
        .insert([
          {
            request_text: requestForm.request_text,
            user_id: student.id,
            status: "pending",
            city: student.city,
            created_at: new Date().toISOString(),
          },
        ]);
      if (error) throw error;
      alert("Request created successfully!");
      setRequestForm({ request_text: "" });
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  }
  
    /*  async function handleAcceptApplication(application) {
        try {
          // 1️⃣ Fetch the request details (get its text and user_id)
          const { data: reqData, error: reqError } = await supabase
            .from("requests")
            .select("id, request_text, user_id")
            .eq("id", application.request_id)
            .single();
          if (reqError) throw reqError;
      
          // 2️⃣ Mark this application as accepted
          await supabase
            .from("request_applications")
            .update({ status: "accepted" })
            .eq("id", application.id);
      
          // 3️⃣ Reject all other applications for this same request
          await supabase
            .from("request_applications")
            .update({ status: "rejected" })
            .eq("request_id", application.request_id)
            .neq("id", application.id);
      
          // 4️⃣ Link teacher and student in teacher_students
          const dateAdded = new Date();
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);

          console.log("✅ Debug details before insert:", {
              application,
              teacher_id: application.teacher?.id,
              student_id: reqData?.user_id,
              reqData,
            }); */
            
            const handleAcceptApplication = async (application) => {
              console.log("🪄 Checking application object:", application);
            
              if (!application.request_id) {
                alert("Missing request ID. Please check the application object.");
                return;
              }
            
              const { data: reqData, error: reqError } = await supabase
                .from("requests")
                .select("id, request_text, user_id")
                .eq("id", application.request_id)
                .single();
            
              if (reqError) {
                console.error("❌ Error fetching request:", reqError);
                return;
              }
            
              console.log("✅ Request data fetched:", reqData);
            };
            await supabase.from("teacher_students").insert([
              {
                teacher_id: application.teacher.id,
                student_id: reqData.user_id,
                subject: reqData.request_text,
                level: "request",
              },
            ]);

      
  /*        await supabase.from("teacher_students").insert([
            {
              teacher_id: application.teacher.id,
              student_id: reqData.user_id, // 👈 link to student who created the request
              subject: reqData.request_text, // 👈 use request text as subject
              level: "request", // 👈 set default level
              date_added: dateAdded.toISOString().split("T")[0],
              expiry_date: expiryDate.toISOString().split("T")[0],
            },
          ]); */
      
          // 5️⃣ Update request to fulfilled
          await supabase
            .from("requests")
            .update({ status: "fulfilled" })
            .eq("id", application.request_id);
      
          alert("Application accepted successfully!");
      
          // 6️⃣ Refresh everything
          setShowApplicationsModal(false);
          fetchRequests();
          fetchMyTeachers();
          setTab("myTeachers"); // switch tab automatically
        } catch (err) {
          console.error("Error accepting application:", err);
          alert(err.message || String(err));
        }
      }

      // Reject teacher application
    async function handleRejectApplication(app) {
      try {
        const { error } = await supabase
          .from("request_applications")
          .update({ status: "rejected" })
          .eq("id", app.id);
        if (error) throw error;
    
        alert("Application rejected successfully.");
        // Optionally refresh the list to show updated status
        handleViewApplications(app.request_id);
      } catch (err) {
        console.error("Error rejecting application:", err);
        alert(err.message || "Failed to reject application.");
      }
    }

    // 🔍 Teacher searches
  async function handleSearchByLocation() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, city, profile_image")
        .ilike("city", searchLocation)
        .eq("user_type", "teacher");
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  async function handleSearchBySubjectAndLevel() {
    try {
      const { data, error } = await supabase
        .from("teacher_rates")
        .select(`
          id, subject, level, rate,
          teacher:teacher_id ( id, full_name, city, profile_image )
        `)
        .ilike("subject", searchSubject)
        .ilike("level", searchLevel);
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  async function handleSearchBySubjectOnly() {
    try {
      const { data, error } = await supabase
        .from("teacher_rates")
        .select(`
          id, subject, level, rate,
          teacher:teacher_id ( id, full_name, city, profile_image )
        `)
        .ilike("subject", searchSubject);
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  // 🔹 Pay to register with teacher
  async function handlePayToRegister(teacherId, subject, level) {
    try {
      if (!student) return alert("Student not found");
      const dateAdded = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error } = await supabase.from("teacher_students").insert([
        {
          student_id: student.id,
          teacher_id: teacherId,
          date_added: dateAdded.toISOString().split("T")[0],
          expiry_date: expiryDate.toISOString().split("T")[0],
          subject: subject || null,
          level: level || null,
        },
      ]);
      if (error) throw error;
      alert("Successfully registered to teacher");
      fetchMyTeachers();
      setTab("myTeachers");
    } catch (err) {
      alert(err.message || String(err));
    }
  }

      // Edit request
    async function handleEditRequest(requestId, newText) {
      try {
        const { error } = await supabase
          .from("requests")
          .update({ request_text: newText })
          .eq("id", requestId);
        if (error) throw error;
        fetchRequests();
        alert("Request updated successfully!");
      } catch (err) {
        alert(err.message || String(err));
      }
    }
    
    // Delete request
    async function handleDeleteRequest(requestId) {
      if (!confirm("Are you sure you want to delete this request?")) return;
      try {
        const { error } = await supabase
          .from("requests")
          .delete()
          .eq("id", requestId);
        if (error) throw error;
        fetchRequests();
        alert("Request deleted successfully!");
      } catch (err) {
        alert(err.message || String(err));
      }
    }
    
    // View applications in modal
      async function handleViewApplications(requestId) {
        try {
          const { data, error } = await supabase
            .from("request_applications")
            .select(`
              id,
              teacher_id,
              monthly_rate,
              status,
              date_applied,
              teacher:teacher_id ( id, full_name, profile_image, city )
            `)
            .eq("request_id", requestId);
      
          if (error) throw error;
      
          setSelectedRequestApplications(data || []);
          setShowApplicationsModal(true);
        } catch (err) {
          console.error("Error fetching applications:", err);
          alert(err.message || String(err));
        }
      }


  // ✅ Upload profile image
  async function uploadProfileImage(file) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const filePath = `student_images/${user.id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student_images")
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase
        .storage
        .from("student_images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_image: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setStudent(prev => ({ ...prev, profile_image: publicUrl }));
      alert("Profile image updated!");
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded shadow">
        <Banner />
        <div className="mt-4">
          <div className="flex gap-3">
            {["profile", "searchTeacher", "myTeachers", "requests"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded ${tab===t? "bg-sky-600 text-white":"bg-sky-50"}`}
              >
                {t==="profile" ? "Profile" : t==="searchTeacher"? "Search Teacher" : t==="myTeachers"? "My Teachers":"Requests"}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab==="profile" && (
            <div className="mt-4 flex gap-4">
              <div>
                <img
                  className="w-28 h-28 rounded-full border"
                  src={student?.profile_image || "/placeholder.png"}
                  alt="profile"
                />
                <div className="mt-2">
                  <label className="cursor-pointer bg-sky-600 text-white px-3 py-1 rounded">
                    {uploading ? "Uploading..." : "Change Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e)=> uploadProfileImage(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
              <div>
                <div><strong>Full name:</strong> {student.full_name}</div>
                <div><strong>Email:</strong> {student.email}</div>
                <div><strong>Phone:</strong> {student.phone}</div>
                <div><strong>City:</strong> {student.city}</div>
              </div>
            </div>
          )}

          {/* Search Teacher Tab */}
          {tab==="searchTeacher" && (
            <div className="mt-4 space-y-4">
              {/* Location and Subject Filters */}
              <div>
                <input
                  value={searchLocation}
                  onChange={(e)=>setSearchLocation(e.target.value)}
                  placeholder="Location (city)"
                  className="w-full p-2 border rounded"
                />
                <div className="mt-2">
                  <button
                    onClick={handleSearchByLocation}
                    className="bg-emerald-600 text-white px-4 py-2 rounded"
                  >
                    Search by Location
                  </button>
                </div>
              </div>
              <div>
                <input
                  value={searchSubject}
                  onChange={(e)=>setSearchSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full p-2 border rounded"
                />
                <div className="flex gap-2 mt-2">
                  <select
                    value={searchLevel}
                    onChange={(e)=>setSearchLevel(e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="">Select level</option>
                    <option value="JHS">JHS</option>
                    <option value="SHS">SHS</option>
                    <option value="Remedial">Remedial</option>
                  </select>
                  <button
                    onClick={handleSearchBySubjectAndLevel}
                    className="bg-emerald-600 text-white px-4 py-2 rounded"
                  >
                    Search by Subject & Level
                  </button>
                  <button
                    onClick={handleSearchBySubjectOnly}
                    className="bg-sky-600 text-white px-4 py-2 rounded"
                  >
                    Search Subject Only
                  </button>
                </div>
              </div>

              {/* Teacher Results */}
              <div>
                <h4 className="font-semibold">Results</h4>
                <div className="space-y-3 mt-2">
                  {teachers.length === 0 && <div className="text-slate-600">No results</div>}
                  {teachers.map((it, idx) => {
                    const teacherObj = it.teacher || it;
                    return (
                      <div
                        key={idx}
                        className="p-3 border rounded bg-white flex gap-4 items-center cursor-pointer hover:bg-slate-50"
                        onClick={() => router.push(`/teacher/${teacherObj.id}`)}
                      >
                        <img
                          src={teacherObj.profile_image || "/placeholder.png"}
                          alt={teacherObj.full_name}
                          className="w-16 h-16 rounded-full border object-cover"
                        />
                        <div className="flex-1">
                          <div className="font-semibold">{teacherObj.full_name}</div>
                          <div className="text-sm text-slate-600">{teacherObj.city}</div>
                          {it.subject && (
                            <div className="text-sm">
                              Subject: {it.subject} ({it.level}) — GHC {it.rate}
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayToRegister(teacherObj.id, it.subject, it.level);
                            }}
                          >
                            Pay to Register
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* My Teachers Tab */}
          {tab==="myTeachers" && (
            <div className="mt-4">
              <h4 className="font-semibold">My Teachers</h4>
              <div className="space-y-3 mt-3">
                {myTeachers.length === 0 && <div className="text-slate-600">You have no registered teachers.</div>}
                {myTeachers.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 border rounded bg-gray-50 flex gap-4 items-center cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/teacher/${m.teacher.id}`)}
                  >
                    <img
                      src={m.teacher?.profile_image || "/placeholder.png"}
                      alt={m.teacher?.full_name}
                      className="w-16 h-16 rounded-full border object-cover"
                    />
                    <div>
                      <div className="font-semibold text-lg">{m.teacher.full_name}</div>
                      <div className="text-sm text-slate-600">
                        {m.teacher.email} | {m.teacher.phone}
                      </div>
                      <div className="text-sm">
                        Subject: <span className="font-medium">{m.subject}</span> ({m.level})
                      </div>
                      <div className="text-xs text-slate-500">
                        Date added: {m.date_added} — Expires: {m.expiry_date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

                        {/* Requests Tab */}
              {tab === "requests" && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">My Requests</h4>
              
                  {/* Create Request */}
                  <div className="mb-4">
                    <textarea
                      value={requestForm.request_text}
                      onChange={(e) => setRequestForm({ request_text: e.target.value })}
                      placeholder="Enter your request here..."
                      className="w-full p-2 border rounded"
                    />
                    <button
                      onClick={handleCreateRequest}
                      className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Create Request
                    </button>
                  </div>
              
                  {/* List Requests */}
                  {loadingRequests ? (
                    <p>Loading requests...</p>
                  ) : filteredRequests.length === 0 ? (
                    <p className="text-slate-600">No requests found.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredRequests.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 border rounded bg-white hover:bg-slate-50"
                        >
                          <div className="mb-2">{r.request_text}</div>
                          <div className="text-xs text-gray-500 mb-2">
                            Status: {r.status} | Created at: {new Date(r.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-2">
                            {/* Edit button */}
                            <button
                              onClick={() => {
                                const newText = prompt("Edit your request:", r.request_text);
                                if (newText !== null) handleEditRequest(r.id, newText);
                              }}
                              className="px-3 py-1 bg-yellow-400 text-white rounded"
                            >
                              Edit
                            </button>
              
                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteRequest(r.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded"
                            >
                              Delete
                            </button>
              
                            {/* View Applications button */}
                            <button
                              onClick={() => handleViewApplications(r.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              View Applications
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Applications Modal */}
{showApplicationsModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
      <h2 className="text-lg font-bold mb-4">Teacher Applications</h2>

      {selectedRequestApplications.length === 0 ? (
        <p className="text-gray-500">No applications yet.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {selectedRequestApplications.map((app) => (
            <div
              key={app.id}
              className="p-3 border rounded bg-gray-50 flex gap-4 items-center"
            >
              <img
                src={app.teacher?.profile_image || "/placeholder.png"}
                alt={app.teacher?.full_name}
                className="w-12 h-12 rounded-full border object-cover"
              />
              <div className="flex-1">
                <div className="font-semibold">{app.teacher?.full_name}</div>
                <div className="text-sm text-gray-500">{app.teacher?.city}</div>
                <div className="text-sm">
                  Monthly Rate: GHC {app.monthly_rate} — Status: {app.status}
                </div>
                <div className="text-xs text-gray-400">
                  Applied on: {new Date(app.date_applied).toLocaleString()}
                </div>
                {app.status === "pending" && (
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() => handleAcceptApplication(app)}
                  >
                    Accept
                  </button>
                )}  
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          className="bg-gray-400 px-4 py-2 rounded text-white"
          onClick={() => setShowApplicationsModal(false)}
        >
          Close
        </button>
        <button
          className="bg-red-600 text-white px-3 py-1 rounded"
          onClick={() => handleRejectApplication(app)}
        >
          Reject
    </button>
      </div>
    </div>
  </div>
)}


        </div>
      </div>
    </div>
  );
}











