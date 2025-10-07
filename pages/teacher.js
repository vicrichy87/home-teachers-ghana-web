// pages/teacher.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../components/Banner";

export default function TeacherPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  const [students, setStudents] = useState([]);
  const [rates, setRates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [parents, setParents] = useState([]);

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [rate, setRate] = useState("200");
  const [savingRate, setSavingRate] = useState(false);

  const [editingRate, setEditingRate] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editRate, setEditRate] = useState("");

  const [uploading, setUploading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({
    students: false,
    parents: false,
    requests: false,
  });

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  useEffect(() => {
    if (teacher?.id) {
      fetchStudents();
      fetchRequests(); 
    }
  }, [teacher]);

  useEffect(() => {
    fetchTeacherProfile();
  }, []);

  useEffect(() => {
    if (tab === "students") fetchStudents();
    if (tab === "myRates") fetchRates();
  }, [tab, teacher]);

  function formatDate(dateStr) {
        if (!dateStr) return "Not set";
        const date = new Date(dateStr);
        if (isNaN(date)) return "Not set";
        return date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
  
  async function fetchTeacherProfile() {
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
      setTeacher(data);
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchRequests() {
    try {
      // 1️⃣ Fetch accepted requests related to this teacher
      const { data: requestData, error: requestError } = await supabase
        .from("parent_request_teacher_child")
        .select("id, parent_id, child_id, date_added, expiry_date, status")
        .eq("teacher_id", teacher.id)
        .eq("status", "accepted") // only accepted ones
        .order("date_added", { ascending: false });
  
      if (requestError) throw requestError;
  
      if (!requestData || requestData.length === 0) {
        setRequests([]);
        return;
      }
  
      // 2️⃣ Extract parent and child IDs
      const parentIds = [...new Set(requestData.map(r => r.parent_id))].filter(Boolean);
      const childIds = [...new Set(requestData.map(r => r.child_id))].filter(Boolean);
  
      // 3️⃣ Fetch parent info from users table
      const { data: parentsData, error: parentsError } = await supabase
        .from("users")
        .select("id, full_name, phone, profile_image")
        .in("id", parentIds);
  
      if (parentsError) throw parentsError;
  
      // 4️⃣ Fetch child info from parents_children table
      const { data: childrenData, error: childrenError } = await supabase
        .from("parents_children")
        .select("id, full_name")
        .in("id", childIds);
  
      if (childrenError) throw childrenError;
  
      // 5️⃣ Format all data neatly
      const formatDate = (timestamp) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      };
  
      const formattedRequests = requestData.map(req => {
        const parent = parentsData?.find(p => p.id === req.parent_id) || {};
        const child = childrenData?.find(c => c.id === req.child_id) || { full_name: "Unknown" };
  
        let imageUrl = parent.profile_image || "/placeholder.png";
        if (imageUrl && !imageUrl.startsWith("http")) {
          const { data: publicUrlData } = supabase.storage
            .from("parent_images")
            .getPublicUrl(imageUrl);
          imageUrl = publicUrlData?.publicUrl || "/placeholder.png";
        }
  
        return {
          id: req.id,
          parent: {
            ...parent,
            image_url: imageUrl,
          },
          child,
          date_added: formatDate(req.date_added),
          expiry_date: formatDate(req.expiry_date),
          status: req.status,
        };
      });
  
      // 6️⃣ Update state
      setRequests(formattedRequests);
  
    } catch (err) {
      console.error("Error fetching requests:", err.message);
      alert(err.message || "Failed to load request students.");
    }
  }

  // ✅ Updated: fetch students with subject, level, phone and image  
  async function fetchStudents() {
    if (!teacher?.id) return;
    try {
      const formatDate = (ts) => {
        if (!ts) return "";
        const d = new Date(ts);
        // en-GB: "06 Oct 2025"
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      };
  
      // ---------- 1) teacher_students (regular + request-level entries) ----------
      const { data: tsData, error: tsError } = await supabase
        .from("teacher_students")
        .select(`
          id,
          subject,
          level,
          date_added,
          expiry_date,
          student:student_id ( id, full_name, email, phone, profile_image )
        `)
        .eq("teacher_id", teacher.id)
        .order("date_added", { ascending: false });
  
      if (tsError) throw tsError;
  
      // normalize teacher_students entries to a common shape
      const studentsFromTeacher = (tsData || []).map((s) => {
        // compute image url; if stored path, try public url; otherwise placeholder
        let image = s.student?.profile_image || "/placeholder.png";
        if (image && !image.startsWith("http")) {
          const { data: publicUrlData } = supabase.storage.from("student_images").getPublicUrl(image);
          image = publicUrlData?.publicUrl || "/placeholder.png";
        }
        return {
          _key: `ts-${s.id}`,           // unique key for react lists
          source: "teacher_students",
          id: s.id,
          subject: s.subject,
          level: s.level,
          student: {
            id: s.student?.id || null,
            full_name: s.student?.full_name || "Unknown",
            email: s.student?.email || "",
            phone: s.student?.phone || "",
            image_url: image,
          },
          date_added: formatDate(s.date_added),
          expiry_date: formatDate(s.expiry_date),
        };
      });
  
      // ---------- 2) parent_child_teachers (parents + their child links) ----------
      const { data: links, error: linksError } = await supabase
        .from("parent_child_teachers")
        .select("id, parent_id, child_id, date_added, expiry_date")
        .eq("teacher_id", teacher.id);
  
      if (linksError) throw linksError;
  
      const parentIdsFromLinks = [...new Set((links || []).map((l) => l.parent_id).filter(Boolean))];
      const childIdsFromLinks = [...new Set((links || []).map((l) => l.child_id).filter(Boolean))];
  
      // fetch parent user info
      let parentsData = [];
      if (parentIdsFromLinks.length) {
        const { data: pData, error: pError } = await supabase
          .from("users")
          .select("id, full_name, phone, profile_image")
          .in("id", parentIdsFromLinks);
        if (pError) throw pError;
        parentsData = pData || [];
      }
  
      // fetch child info from parents_children
      let childrenData = [];
      if (childIdsFromLinks.length) {
        const { data: cData, error: cError } = await supabase
          .from("parents_children")
          .select("id, full_name")
          .in("id", childIdsFromLinks);
        if (cError) throw cError;
        childrenData = cData || [];
      }
  
      const formattedParents = (links || []).map((link) => {
        const parent = parentsData.find((p) => p.id === link.parent_id) || {};
        const child = childrenData.find((c) => c.id === link.child_id) || { full_name: "Unknown" };
  
        // parent image (public url attempt)
        let parentImage = parent.profile_image || "/placeholder.png";
        if (parentImage && !parentImage.startsWith("http")) {
          const { data: pub } = supabase.storage.from("profile-pictures").getPublicUrl(parentImage);
          parentImage = pub?.publicUrl || "/placeholder.png";
        }
  
        return {
          id: link.id,
          parent: {
            id: parent.id || null,
            full_name: parent.full_name || "Unknown",
            phone: parent.phone || "",
            image_url: parentImage,
          },
          child: {
            id: child.id || null,
            full_name: child.full_name || "Unknown",
          },
          date_added: formatDate(link.date_added),
          expiry_date: formatDate(link.expiry_date),
        };
      });
  
      // ---------- 3) parent_request_teacher_child (accepted parent requests applied to teacher) ----------
      // only include rows where parent accepted (status = 'accepted')
      const { data: prtData, error: prtError } = await supabase
        .from("parent_request_teacher_child")
        .select("id, parent_id, child_id, request_id, application_id, date_added, expiry_date, status")
        .eq("teacher_id", teacher.id)
        .eq("status", "accepted") // match your requirement
        .order("date_added", { ascending: false });
  
      if (prtError) throw prtError;
  
      // collect ids that might not have been fetched earlier
      const prtParentIds = [...new Set((prtData || []).map((r) => r.parent_id).filter(Boolean))];
      const prtChildIds = [...new Set((prtData || []).map((r) => r.child_id).filter(Boolean))];
      const missingParentIds = prtParentIds.filter((id) => !parentIdsFromLinks.includes(id));
      const missingChildIds = prtChildIds.filter((id) => !childIdsFromLinks.includes(id));
  
      // fetch any missing parent / child rows
      let extraParents = [];
      if (missingParentIds.length) {
        const { data: pEx, error: pExErr } = await supabase
          .from("users")
          .select("id, full_name, phone, profile_image")
          .in("id", missingParentIds);
        if (pExErr) throw pExErr;
        extraParents = pEx || [];
      }
  
      let extraChildren = [];
      if (missingChildIds.length) {
        const { data: cEx, error: cExErr } = await supabase
          .from("parents_children")
          .select("id, full_name")
          .in("id", missingChildIds);
        if (cExErr) throw cExErr;
        extraChildren = cEx || [];
      }
  
      const allParents = [...parentsData, ...extraParents];
      const allChildren = [...childrenData, ...extraChildren];
  
      // (optional) fetch request_text for request_id to show subject/details - helps UI clarity
      const requestIds = [...new Set((prtData || []).map((r) => r.request_id).filter(Boolean))];
      let requestsMap = {};
      if (requestIds.length) {
        const { data: reqs, error: reqErr } = await supabase
          .from("requests")
          .select("id, request_text")
          .in("id", requestIds);
        if (reqErr) throw reqErr;
        requestsMap = (reqs || []).reduce((acc, cur) => {
          acc[cur.id] = cur.request_text;
          return acc;
        }, {});
      }
  
      // Map parent_request_teacher_child into entries compatible with teacher_students display, mark source 'parent_request'
      const requestStudentsFromParents = (prtData || []).map((r) => {
        const parent = allParents.find((p) => p.id === r.parent_id) || {};
        const child = allChildren.find((c) => c.id === r.child_id) || { full_name: "Unknown" };
  
        // parent image fallback
        let parentImg = parent.profile_image || "/placeholder.png";
        if (parentImg && !parentImg.startsWith("http")) {
          const { data: pub } = supabase.storage.from("profile-pictures").getPublicUrl(parentImg);
          parentImg = pub?.publicUrl || "/placeholder.png";
        }
  
        return {
          _key: `prt-${r.id}`,
          source: "parent_request_teacher_child",
          id: r.id,
          subject: requestsMap[r.request_id] || "Request",
          level: "request", // ensures this appears in Request Students group
          student: {
            id: child.id || null,
            full_name: child.full_name || "Unknown",
            email: "", // child has no email
            phone: parent.phone || "",
            image_url: parentImg, // show parent image for the child card
          },
          date_added: formatDate(r.date_added),
          expiry_date: formatDate(r.expiry_date),
        };
      });
  
      // ---------- 4) Combine teacher_students + requestStudentsFromParents ----------
      // note: teacher_students may already include some level==='request' entries; keep them and add parent-request entries
      const combinedStudents = [...studentsFromTeacher, ...requestStudentsFromParents];
  
      // set states
      setStudents(combinedStudents);
      setParents(formattedParents);
  
      // debug logs
      console.debug("fetchStudents: teacher_students rows:", tsData?.length || 0);
      console.debug("fetchStudents: parent_child_teachers links:", links?.length || 0);
      console.debug("fetchStudents: parent_request_teacher_child accepted:", prtData?.length || 0);
    } catch (err) {
      console.error("fetchStudents error:", err);
      alert(err.message || String(err));
    }
  }
   
  async function fetchRates() {
    try {
      const { data, error } = await supabase
        .from("teacher_rates")
        .select("id, subject, level, rate")
        .eq("teacher_id", teacher.id)
        .order("id", { ascending: false });
      if (error) throw error;
      setRates(data || []);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  async function handleAddRate() {
    if (!subject || !level) return alert("Provide subject and level");
    setSavingRate(true);
    try {
      const { error } = await supabase.from("teacher_rates").insert([{
        teacher_id: teacher.id,
        subject,
        level,
        rate: parseFloat(rate),
      }]);
      if (error) throw error;
      setSubject(""); setLevel(""); setRate("200");
      fetchRates();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setSavingRate(false);
    }
  }

  async function handleDeleteRate(id) {
    try {
      const { error } = await supabase.from("teacher_rates").delete().eq("id", id);
      if (error) throw error;
      setRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  function startEditRate(item) {
    setEditingRate(item.id);
    setEditSubject(item.subject);
    setEditLevel(item.level);
    setEditRate(String(item.rate));
  }

  async function handleSaveEditRate() {
    if (!editSubject || !editLevel) return alert("Fill fields");
    try {
      const { error } = await supabase.from("teacher_rates").update({
        subject: editSubject,
        level: editLevel,
        rate: parseFloat(editRate),
      }).eq("id", editingRate);
      if (error) throw error;
      setRates(prev =>
        prev.map(r =>
          r.id === editingRate
            ? { ...r, subject: editSubject, level: editLevel, rate: parseFloat(editRate) }
            : r
        )
      );
      setEditingRate(null);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  // ✅ Upload profile image to "profile-pictures"
  async function handlePickImage(file) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not logged in");

      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_image: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setTeacher(prev => ({ ...prev, profile_image: publicUrl }));
      alert("Profile image updated");
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <Banner />
      <div className="mt-4 flex gap-3">
        {["profile", "students", "rates", "myRates"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${
              tab === t ? "bg-sky-600 text-white" : "bg-sky-50"
            }`}
          >
            {t === "profile"
              ? "Profile"
              : t === "students"
              ? "View Students"
              : t === "rates"
              ? "Add Rates"
              : "My Rates"}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="mt-4 flex gap-6">
          <div>
            <img
              src={teacher?.profile_image || "/placeholder.png"}
              className="w-28 h-28 rounded-full border"
            />
            <div className="mt-2">
              <label className="bg-sky-600 text-white px-3 py-1 rounded cursor-pointer">
                {uploading ? "Uploading..." : "Change Photo"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handlePickImage(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <div>
            <div><strong>{teacher.full_name}</strong></div>
            <div>{teacher.email}</div>
            <div>{teacher.phone}</div>
            <div>{teacher.city}</div>
            <div>{teacher.sex}</div>
            <div>{teacher.dob}</div>
          </div>
        </div>
      )}

      {/* Students Group */}
      <h4
        className="font-semibold mb-2 flex items-center justify-between cursor-pointer"
        onClick={() => toggleGroup("students")}
      >
        My Students
        <span>{collapsedGroups.students ? "▼" : "▲"}</span>
      </h4>
      {!collapsedGroups.students && (
        <div className="space-y-3 mb-4">
          {students.filter(s => s.level !== "request").length === 0 && (
            <p className="text-gray-500">No students yet.</p>
          )}
      
          {/* Only pick first instance per student for the list */}
          {students
            .filter(s => s.level !== "request")
            .reduce((uniqueStudents, s) => {
              if (!uniqueStudents.some(us => us.student.id === s.student.id)) {
                uniqueStudents.push(s);
              }
              return uniqueStudents;
            }, [])
            .map((s) => {
              return (
                <div
                  key={s.id}
                  onClick={() =>
                    router.push(`/teacher-student/${teacher.id}~${s.student.id}`)
                  }
                  className="border p-3 rounded flex items-center gap-3 cursor-pointer hover:bg-gray-50 hover:shadow transition"
                >
                  <img
                    src={s.student.image_url}
                    alt={s.student.full_name}
                    className="w-14 h-14 rounded-full border object-cover"
                  />
                  <div>
                    <div className="font-semibold">{s.student.full_name}</div>
                    <div className="text-sm text-gray-600">{s.student.email}</div>
                    <div className="text-sm text-gray-600">📞 {s.student.phone}</div>
                    <div className="text-sm">
                      📘 {s.subject} ({s.level})
                    </div>
                    <div className="text-xs text-gray-500">
                      Added: {s.date_added} — Expiry: {s.expiry_date}
                    </div>
                  </div>
                </div>
              );
            })}

      
          {/* Parents Group */}
          <h4
            className="font-semibold mb-2 flex items-center justify-between cursor-pointer"
            onClick={() => toggleGroup("parents")}
          >
            Parents
            <span>{collapsedGroups.parents ? "▼" : "▲"}</span>
          </h4>
          {!collapsedGroups.parents && (
            <div className="space-y-3 mb-4">
              {parents.length === 0 && <p className="text-gray-500">No parents yet.</p>}
              {parents.map(p => (
                <div
                  key={p.id}
                  className="border p-3 rounded flex items-center gap-3"
                >
                  <img
                    src={p.parent.image_url}
                    alt={p.parent.full_name}
                    className="w-14 h-14 rounded-full border object-cover"
                  />
                  <div>
                    <div className="font-semibold">{p.parent.full_name}</div>
                    <div className="text-sm text-gray-600">📞 {p.parent.phone}</div>
                    <div className="text-sm text-gray-600">Child: {p.child.full_name}</div>
                    <div className="text-xs text-gray-500">Added: {p.date_added} — Expiry: {p.expiry_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      
          {/* Request Students Group */}
          <h4
            className="font-semibold mb-2 flex items-center justify-between cursor-pointer"
            onClick={() => toggleGroup("requests")}
          >
            Request Students
            <span>{collapsedGroups.requests ? "▼" : "▲"}</span>
          </h4>
          {!collapsedGroups.requests && (
            <div className="space-y-3">
              {students.filter(s => s.level === "request").length === 0 && (
                <p className="text-gray-500">No request students yet.</p>
              )}
              {students
                .filter(s => s.level === "request")
                .map(s => (
                  <div
                    key={s.id}
                    className="border p-3 rounded flex items-center gap-3"
                  >
                    <img
                      src={s.student.image_url}
                      alt={s.student.full_name}
                      className="w-14 h-14 rounded-full border object-cover"
                    />
                    <div>
                      <div className="font-semibold">{s.student.full_name}</div>
                      <div className="text-sm text-gray-600">{s.student.email}</div>
                      <div className="text-sm text-gray-600">📞 {s.student.phone}</div>
                      <div className="text-sm">
                        📘 {s.subject} ({s.level})
                      </div>
                      <div className="text-xs text-gray-500">
                        Added: {s.date_added} — Expiry: {s.expiry_date}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
              
            {/* Rates tabs remain unchanged */}
            {tab === "rates" && (
              <div className="mt-4">
                <input
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <div className="flex gap-2 mt-2">
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="">Select level</option>
                    <option value="Nursery">Nursery</option>  
                    <option value="JHS">JHS</option>
                    <option value="SHS">SHS</option>
                    <option value="Remedial">Remedial</option>
                  </select>
                  <input
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="p-2 border rounded"
                    placeholder="Rate GHC"
                  />
                  <button
                    onClick={handleAddRate}
                    className="bg-emerald-600 text-white px-4 py-2 rounded"
                  >
                    {savingRate ? "Saving..." : "Add Rate"}
                  </button>
                </div>
              </div>
            )}

      {tab === "myRates" && (
        <div className="mt-4 space-y-3">
          {rates.length === 0 && <div>No rates</div>}
          {rates.map(item =>
            editingRate === item.id ? (
              <div className="p-3 border rounded" key={item.id}>
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <div className="flex gap-2 mt-2">
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="">Select</option>
                    <option value="Nursery">Nursery</option>  
                    <option value="JHS">JHS</option>
                    <option value="SHS">SHS</option>
                    <option value="Remedial">Remedial</option>
                  </select>
                  <input
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveEditRate}
                    className="bg-sky-600 text-white px-3 py-1 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingRate(null)}
                    className="bg-gray-300 px-3 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 border rounded" key={item.id}>
                <div className="font-semibold">{item.subject}</div>
                <div>
                  {item.level} — GHC {item.rate}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => startEditRate(item)}
                    className="bg-sky-600 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRate(item.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}



