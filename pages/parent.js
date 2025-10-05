// pages/parent.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../components/Banner";

export default function ParentPage() {
  const router = useRouter();
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  const [teachers, setTeachers] = useState([]);
  const [myChildTeachers, setMyChildTeachers] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchLevel, setSearchLevel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestForm, setRequestForm] = useState({ request_text: "", city: "" });
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequestStatus, setSelectedRequestStatus] = useState(null);
  const [user, setUser] = useState(null);



  // Modal states
  const [showChildModal, setShowChildModal] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [childForm, setChildForm] = useState({ full_name: "", sex: "", dob: "" });
  const [applications, setApplications] = useState([]);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        router.push("/login");
        return;
      }
      setUser(authData.user);
    };
    getUser();
  }, []);
  
  useEffect(() => {
    const fetchChildren = async () => {
      if (!parent?.id) return;

      const { data, error } = await supabase
        .from("parents_children") // ✅ adjust if your table is named differently
        .select("*")
        .eq("parent_id", parent.id);

      if (error) {
        console.error("Error fetching children:", error.message);
      } else {
        setChildren(data || []);
      }
    };

    fetchChildren();
  }, [parent]);
  
  useEffect(() => { fetchParentProfile(); }, []);
  useEffect(() => { if (tab === "myChildTeachers" && parent) fetchMyChildTeachers(); }, [tab, parent]);
  useEffect(() => {
  const fetchRequests = async () => {
    try {
      const { data: requestsData, error: reqError } = await supabase
        .from("requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;

      // Sort: fulfilled first
      const sortedRequests = (requestsData || []).sort((a, b) => {
        if (a.status === "fulfilled" && b.status !== "fulfilled") return -1;
        if (a.status !== "fulfilled" && b.status === "fulfilled") return 1;
        return 0;
      });

      setRequests(sortedRequests);
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  };

  if (user && tab === "requests") {
    fetchRequests();

    // Real-time subscription
    const channel = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          fetchRequests(); // re-fetch & re-sort
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}, [user, tab]);

  useEffect(() => {
    async function detectLocation() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data && data.city) setSearchLocation(data.city);
      } catch (err) { console.error("Location detect error:", err); }
    }
    detectLocation();
  }, []);

  async function fetchParentProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (error) throw error;
      setParent(data);

      const { data: childrenData, error: childrenError } = await supabase
        .from("parents_children")
        .select("*")
        .eq("parent_id", user.id);
      if (childrenError) throw childrenError;
      setChildren(childrenData || []);
    } catch (err) { alert(err.message || String(err)); }
    finally { setLoading(false); }
  }

  async function fetchMyChildTeachers() {
    try {
      const { data, error } = await supabase
        .from("parent_child_teachers")
        .select(`
          id,
          date_added,
          expiry_date,
          subject,
          level,
          child:child_id ( id, full_name ),
          teacher:teacher_id ( id, full_name, email, phone, city, profile_image )
        `)
        .eq("parent_id", parent.id);
      if (error) throw error;
      setMyChildTeachers(data || []);
    } catch (err) { alert(err.message || String(err)); }
  }

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("id, created_at, city, request_text, user_id, status")    
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  async function handleSubmitRequest() {
  if (!requestForm.request_text) {
    alert("Please enter your request");
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error } = await supabase.from("requests").insert([
      {
        user_id: user.id,
        request_text: requestForm.request_text,
        city: requestForm.city,
        child_id: selectedChildId || null
      }
    ]);
    if (error) throw error;

    alert("Request created successfully");
    setRequestForm({ request_text: "", city: "" });
    fetchRequests();
  } catch (err) {
    alert(err.message || String(err));
  }
 }

  async function handleDeleteRequest(id) {
  if (!confirm("Are you sure you want to delete this request?")) return;
  try {
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) throw error;
    alert("Request deleted successfully");
    fetchRequests();
  } catch (err) {
    alert(err.message || String(err));
  }
 }

  async function handleEditRequest(id, oldText) {
  const newText = prompt("Edit your request:", oldText);
  if (!newText) return;
  try {
    const { error } = await supabase
      .from("requests")
      .update({ request_text: newText })
      .eq("id", id);
    if (error) throw error;
    alert("Request updated successfully");
    fetchRequests();
  } catch (err) {
    alert(err.message || String(err));
  }
 }

  // Open applications modal and set current request
  async function handleViewApplications(requestId, requestStatus, childId) {
    try {
      const { data, error } = await supabase
        .from("request_applications")
        .select(`
          id,
          monthly_rate,
          status,
          date_applied,
          teacher:teacher_id ( id, full_name, email )
        `)
        .eq("request_id", requestId);

      if (error) throw error;

      setApplications(data || []);
      setCurrentRequestId(requestId);   // ✅ fixed
      setSelectedRequestStatus(requestStatus);
      setSelectedChildId(childId || "");
      setShowApplicationsModal(true);
    } catch (err) {
      alert(err.message);
    }
  }


// Update application status (accept/reject)
  const handleUpdateApplicationStatus = async (applicationId, newStatus, teacherId) => {
  try {
    console.log("🔹 handleUpdateApplicationStatus called with:", {
      applicationId,
      newStatus,
      teacherId,
      selectedChildId,
      userId: user?.id,
    });

    if (!selectedChildId || !teacherId || !user?.id) {
      console.error("❌ Missing IDs for insert:", {
        parent_id: user?.id,
        child_id: selectedChildId,
        teacher_id: teacherId,
      });
      alert("Please make sure you selected a child before accepting.");
      return;
    }

    // 1. Update application status
    const { error: updateError } = await supabase
      .from("request_applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (updateError) {
      console.error("❌ Error updating application:", updateError);
      throw updateError;
    }

    // 2. If accepted → reject others, update request, insert into parent_child_teachers
    if (newStatus === "accepted") {
      // Reject all other applications for this request
      const { error: rejectError } = await supabase
        .from("request_applications")
        .update({ status: "rejected" })
        .eq("request_id", selectedRequestId)
        .neq("id", applicationId);

      if (rejectError) {
        console.error("❌ Error rejecting other apps:", rejectError);
      }

      // Update the request as fulfilled
      const { error: reqError } = await supabase
        .from("requests")
        .update({ status: "fulfilled" })
        .eq("id", selectedRequestId);

      if (reqError) {
        console.error("❌ Error updating request:", reqError);
      }

      // Insert into parent_child_teachers
      const newEntry = {
        parent_id: user.id,
        child_id: selectedChildId,
        teacher_id: teacherId,
        date_added: new Date().toISOString(),
      };

      console.log("🟢 Inserting into parent_child_teachers:", newEntry);

      const { error: insertError } = await supabase
        .from("parent_child_teachers")
        .insert([newEntry]);

      if (insertError) {
        console.error("❌ Insert error:", insertError);
        throw insertError;
      }

      console.log("✅ Successfully inserted into parent_child_teachers");
    }

    alert("Application updated successfully!");
  } catch (err) {
    console.error("❌ General error in handleUpdateApplicationStatus:", err);
    alert("Error updating application: " + (err.message || err));
  }
};


   
  async function uploadProfileImage(file) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const filePath = `profile-pictures/${user.id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = await supabase
        .storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_image: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setParent(prev => ({ ...prev, profile_image: publicUrl }));
      alert("Profile image updated!");
    } catch (err) { alert(err.message || String(err)); }
    finally { setUploading(false); }
  }

   // Modal functions
  function openAddChildModal() {
    setEditingChild(null);
    setChildForm({ full_name: "", sex: "", dob: "" });
    setShowChildModal(true);
  }

  function openEditChildModal(child) {
    setEditingChild(child);
    setChildForm({ full_name: child.full_name, sex: child.sex, dob: child.dob });
    setShowChildModal(true);
  }

  async function handleSubmitChild() {
    const { full_name, sex, dob } = childForm;
    if (!full_name || !sex || !dob) return alert("All fields are required");
    if (!["male","female"].includes(sex.toLowerCase())) return alert("Sex must be Male or Female");

    try {
      if (editingChild) {
        const { error } = await supabase
          .from("parents_children")
          .update({ full_name, sex, dob })
          .eq("id", editingChild.id);
        if (error) throw error;
        setChildren(prev => prev.map(c => c.id === editingChild.id ? { ...c, full_name, sex, dob } : c));
        alert("Child updated successfully");
      } else {
        const { data, error } = await supabase
          .from("parents_children")
          .insert([{ parent_id: parent.id, full_name, sex, dob }])
          .select();
        if (error) throw error;
        setChildren(prev => [...prev, data[0]]);
        alert("Child added successfully");
      }
    } catch (err) { alert(err.message || String(err)); }
    finally { setShowChildModal(false); }
  }

  async function handleDeleteChild(childId) {
    const child = children.find(c => c.id === childId);
    if (!confirm(`Are you sure you want to delete ${child.full_name}?`)) return;
    try {
      const { error } = await supabase
        .from("parents_children")
        .delete()
        .eq("id", childId);
      if (error) throw error;
      setChildren(prev => prev.filter(c => c.id !== childId));
      alert("Child deleted successfully");
    } catch (err) { alert(err.message || String(err)); }
  }

  // SEARCH FUNCTIONS
  async function handleSearchByLocation() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, city, profile_image")
        .ilike("city", `%${searchLocation}%`)
        .eq("user_type", "teacher");
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) { alert(err.message || String(err)); }
  }

  async function handleSearchBySubjectOnly() {
    try {
      const { data, error } = await supabase
        .from("teacher_rates")
        .select(`
          id, subject, level, rate,
          teacher:teacher_id ( id, full_name, city, profile_image )
        `)
        .ilike("subject", `%${searchSubject}%`);
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) { alert(err.message || String(err)); }
  }

  async function handleSearchBySubjectAndLevel() {
    try {
      const { data, error } = await supabase
        .from("teacher_rates")
        .select(`
          id, subject, level, rate,
          teacher:teacher_id ( id, full_name, city, profile_image )
        `)
        .ilike("subject", `%${searchSubject}%`)
        .ilike("level", `%${searchLevel}%`);
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) { alert(err.message || String(err)); }
  }

  async function handlePayToRegisterChild(childId, teacherId, subject, level) {
    if (!childId) return alert("Please select a child first");

    try {
      const dateAdded = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error } = await supabase.from("parent_child_teachers").insert([
        {
          parent_id: parent.id,
          child_id: childId,
          teacher_id: teacherId,
          date_added: dateAdded.toISOString().split("T")[0],
          expiry_date: expiryDate.toISOString().split("T")[0],
          subject: subject || null,
          level: level || null,
        },
      ]);
      if (error) throw error;

      alert("Successfully registered your child to teacher");
      fetchMyChildTeachers();
      setTab("myChildTeachers");
    } catch (err) { alert(err.message || String(err)); }
  }
  
  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded shadow">
        <Banner />
        <div className="mt-4">
          {/* Tabs */}
          <div className="flex gap-3 flex-wrap">
            {["profile", "searchTeacher", "myChildTeachers", "requests"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded ${tab===t? "bg-sky-600 text-white":"bg-sky-50"}`}
              >
                {t==="profile" ? "Profile" 
                 : t==="searchTeacher"? "Search Teachers" 
                 : t==="myChildTeachers"? "My Child’s Teachers" 
                 : "Requests"}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab==="profile" && (
            <div className="mt-4">
              <div className="flex gap-4">
                <div>
                  <img
                    className="w-28 h-28 rounded-full border object-cover"
                    src={parent?.profile_image || "/placeholder.png"}
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
                  <div><strong>Parent:</strong> {parent.full_name}</div>
                  <div><strong>Email:</strong> {parent.email}</div>
                  <div><strong>Phone:</strong> {parent.phone}</div>
                  <div><strong>City:</strong> {parent.city}</div>
                  <div><strong>Sex:</strong> {parent.sex}</div>
                  <div><strong>DOB:</strong> {parent.dob}</div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded"
                  onClick={openAddChildModal}
                >
                  Add New Child
                </button>
              </div>

              {/* Children List */}
              {children.length > 0 && (
                <div className="mt-4 w-full max-w-md space-y-4">
                  <h4 className="font-semibold">My Children</h4>
                  {children.map(c => (
                    <div key={c.id} className="p-3 border rounded bg-gray-50">
                      <div className="mb-2">
                        <div><strong>Name:</strong> {c.full_name}</div>
                        <div><strong>Sex:</strong> {c.sex}</div>
                        <div><strong>DOB:</strong> {c.dob}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="bg-blue-600 text-white px-2 py-1 rounded"
                          onClick={() => openEditChildModal(c)}
                        >Edit</button>
                        <button
                          className="bg-red-600 text-white px-2 py-1 rounded"
                          onClick={() => handleDeleteChild(c.id)}
                        >Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Child Modal */}
          {showChildModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded shadow-lg w-80">
                <h4 className="font-semibold mb-3">{editingChild ? "Edit Child" : "Add New Child"}</h4>
                <input
                  className="w-full p-2 mb-2 border rounded"
                  placeholder="Full Name"
                  value={childForm.full_name}
                  onChange={e => setChildForm({...childForm, full_name: e.target.value})}
                />
                <select
                  className="w-full p-2 mb-2 border rounded"
                  value={childForm.sex}
                  onChange={e => setChildForm({...childForm, sex: e.target.value})}
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <input
                  type="date"
                  className="w-full p-2 mb-2 border rounded"
                  value={childForm.dob}
                  onChange={e => setChildForm({...childForm, dob: e.target.value})}
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    className="px-3 py-1 rounded bg-gray-300"
                    onClick={() => setShowChildModal(false)}
                  >Cancel</button>
                  <button
                    className="px-3 py-1 rounded bg-green-600 text-white"
                    onClick={handleSubmitChild}
                  >Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Search Teachers Tab */}
          {tab==="searchTeacher" && (
            <div className="mt-4 w-full max-w-xl space-y-4">
              {/* By Location */}
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

              {/* By Subject + Level */}
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
                    <option value="Nursery">Nursery</option>
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

              {/* Select Child Dropdown */}
              {children.length > 0 && (
                <div className="mt-3">
                  <label className="block mb-1 font-semibold">Select Child to Register:</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                  >
                    <option value="">-- Select Child --</option>
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Results */}
              <div>
                <h4 className="font-semibold mt-4">Results</h4>
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
                              handlePayToRegisterChild(selectedChildId, teacherObj.id, it.subject, it.level);
                            }}
                          >
                            Pay to Register Child
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* My Child’s Teachers Tab */}
          {tab==="myChildTeachers" && (
            <div className="mt-4 w-full max-w-md space-y-4">
              <h4 className="font-semibold">My Child’s Teachers</h4>
              <div className="space-y-3 mt-3">
                {myChildTeachers.length === 0 && <div className="text-slate-600">No registered teachers yet.</div>}
                {myChildTeachers.map((m) => (
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
                        Child: <span className="font-medium">{m.child?.full_name}</span>
                      </div>
                      <div className="text-sm">
                        Subject: <span className="font-medium">{m.subject}</span> ({m.level})
                      </div>
                      <div className="text-xs text-slate-500">
                        Date added: {new Date(m.date_added).toLocaleDateString()} — Expires: {new Date(m.expiry_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
         {/* NEW: Requests Tab */}
         {tab==="requests" && (
           <div className="mt-4 w-full max-w-md space-y-4">
             <h4 className="font-semibold mb-2">All Requests</h4>

          {/* Request Form */}
            <div className="p-4 mb-4 border rounded bg-white">
              <h5 className="font-semibold mb-2">Create a Request</h5>
                <label className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox"
                    checked={!!selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.checked ? children[0]?.id || "" : "")}
                  />
                    This request is for one of my children
                </label>
                    {selectedChildId !== "" && (
                     <select
                       className="w-full p-2 mb-2 border rounded"
                       value={selectedChildId}
                       onChange={(e) => setSelectedChildId(e.target.value)}
                     >
                     <option value="">-- Select Child --</option>
                       {children.map(c => (
                         <option key={c.id} value={c.id}>{c.full_name}</option>
                     ))}
                   </select>
                 )}

                <textarea
                  placeholder="Type what kind of teacher or classes you are looking for..."
                  className="w-full p-2 mb-2 border rounded"
                  rows={3}
                  value={requestForm.request_text}
                  onChange={(e)=>setRequestForm({...requestForm, request_text:e.target.value})}
               />
                <input
                  type="text"
                  placeholder="City / Location"
                  className="w-full p-2 mb-2 border rounded"
                  value={requestForm.city}
                  onChange={(e)=>setRequestForm({...requestForm, city:e.target.value})}
               />
             <button
               className="bg-green-600 text-white px-4 py-2 rounded"
               onClick={handleSubmitRequest}
             >
               Submit Request
             </button>
           </div>

           {/* Requests List */}
           <div className="max-h-96 overflow-y-scroll border rounded p-3 bg-gray-50 space-y-3">
             {requests.length === 0 && <div className="text-slate-600">No requests available.</div>}
             {requests.map((r) => (
               <div key={r.id} className={`p-3 border rounded ${r.status==="fulfilled" ? "bg-purple-100 border-purple-600" : "bg-white"}`}>
               <div className="text-gray-800">{r.request_text}</div>
               <div className="text-sm text-slate-600">Location: {r.city || "N/A"}</div>
               <div className="text-xs text-slate-500">
                 Posted: {new Date(r.created_at).toLocaleString()}
               {r.child_id && (
                 <div className="text-sm text-slate-600">
                   For Child: {children.find(c => c.id === r.child_id)?.full_name || "Unknown"}
                 </div>
               )}
           </div>
           <div className="flex gap-2 mt-2">
              {r.status !== "fulfilled" && (
                <>
             <button
               className="px-3 py-1 rounded bg-blue-500 text-white"
               onClick={() => handleEditRequest(r.id, r.request_text)}  
             >
               Edit 
             </button>
             <button 
               className="px-3 py-1 rounded bg-red-500 text-white"
               onClick={() => handleDeleteRequest(r.id)}
             >
               Delete
             </button>
           </>
         )}
           <button
             className="px-3 py-1 rounded bg-green-600 text-white"
             onClick={() => handleViewApplications(r.id, r.status, r.child_id)}
           >
             View Applications
           </button>
         </div>
       </div>
    ))}
  </div>
</div>
)}
       {/* Applications Modal */}
       {showApplicationsModal && (
       <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
       <div className="bg-white p-6 rounded-lg shadow-lg w-96">
       <h2 className="text-xl font-bold mb-4">Applications</h2>

      {/* Child selector */}
      <label className="block mb-2">Assign to Child:</label>
      <select
        value={selectedChildId || ""} // ✅ empty string only for UI, state stores null
        onChange={(e) =>
          setSelectedChildId(e.target.value)
        }
        className="border p-2 w-full rounded mb-4"
      >
        <option value="">-- Select a Child --</option>
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.full_name}
          </option>
        ))}
      </select>

      {/* List applications */}
      <ul className="space-y-3 max-h-60 overflow-y-auto">
        {selectedApplications.map((app) => (
          <li
            key={app.id}
            className="border rounded p-3 flex flex-col space-y-2"
          >
            <p>
              <strong>Teacher:</strong> {app.teacher_id}
            </p>
            <p>
              <strong>Rate:</strong> {app.monthly_rate} GHS/month
            </p>
            <p>
              <strong>Status:</strong> {app.status}
            </p>

            {/* Accept / Reject buttons */}
            {selectedRequestStatus === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleUpdateApplicationStatus(app.id, "accepted", app.teacher_id)
                  }
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    handleUpdateApplicationStatus(app.id, "rejected", app.teacher_id)
                  }
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Close button */}
      <button
        onClick={() => setShowApplicationsModal(false)}
        className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
      >
        Close
      </button>
    </div>
  </div>
)}



</div>
</div>
</div>
);
}
