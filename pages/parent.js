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
  const [searchLocation, setSearchLocation] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchLevel, setSearchLevel] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchParentProfile(); }, []);
  useEffect(() => { if (tab === "myChildTeachers" && parent) fetchMyChildTeachers(); }, [tab, parent]);
  useEffect(() => { if (parent) fetchChildren(); }, [parent]);
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

  // Fetch parent profile
  async function fetchParentProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (error) throw error;
      setParent(data);
    } catch (err) { alert(err.message || String(err)); }
    finally { setLoading(false); }
  }

  // Fetch parent's children
  async function fetchChildren() {
    try {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", parent.id);
      if (error) throw error;
      setChildren(data || []);
    } catch (err) { alert(err.message || String(err)); }
  }

  // Add new child
  async function handleAddChild() {
    const name = prompt("Enter child's full name:");
    if (!name) return;
    const sex = prompt("Enter child's sex (M/F):");
    if (!sex) return;
    const dob = prompt("Enter child's DOB (YYYY-MM-DD):");
    if (!dob) return;

    try {
      const { error } = await supabase.from("children").insert([
        { parent_id: parent.id, full_name: name, sex, dob }
      ]);
      if (error) throw error;
      alert("Child added successfully!");
      fetchChildren();
    } catch (err) { alert(err.message || String(err)); }
  }

  // Fetch child’s registered teachers
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
          teacher:teacher_id (
            id, full_name, email, phone, city, profile_image
          )
        `)
        .eq("parent_id", parent.id);
      if (error) throw error;
      setMyChildTeachers(data || []);
    } catch (err) { alert(err.message || String(err)); }
  }

  // 🔍 Search functions
  async function handleSearchByLocation() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, city, profile_image")
        .ilike("city", searchLocation)
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
        .ilike("subject", searchSubject);
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
        .ilike("subject", searchSubject)
        .ilike("level", searchLevel);
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) { alert(err.message || String(err)); }
  }

  // ✅ Upload profile image
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

  // ✅ Register child to teacher
  async function handlePayToRegisterChild(teacherId, subject, level, childId) {
    try {
      if (!parent) return alert("Parent not found");
      if (!childId) return alert("Select a child");

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

      alert("Successfully registered child to teacher");
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
          <div className="flex gap-3">
            {["profile", "searchTeacher", "myChildTeachers"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded ${tab===t? "bg-sky-600 text-white":"bg-sky-50"}`}
              >
                {t==="profile" ? "Profile" : t==="searchTeacher"? "Search Teachers" : "My Child’s Teachers"}
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

                  <div className="mt-3">
                    <h4 className="font-semibold">Children</h4>
                    {children.length === 0 && <div>No children added yet</div>}
                    {children.map(c => (
                      <div key={c.id} className="text-sm">{c.full_name} ({c.sex}) - {c.dob}</div>
                    ))}
                    <button
                      className="mt-2 bg-emerald-600 text-white px-3 py-1 rounded"
                      onClick={handleAddChild}
                    >
                      Add New Child
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Teachers Tab */}
          {tab==="searchTeacher" && (
            <div className="mt-4 space-y-4">
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

              {/* Results */}
              <div>
                <h4 className="font-semibold">Results</h4>
                <div className="space-y-3 mt-2">
                  {teachers.length === 0 && <div className="text-slate-600">No results</div>}
                  {teachers.map((it, idx) => {
                    const teacherObj = it.teacher || it;
                    const [selectedChild, setSelectedChild] = useState(children[0]?.id || "");

                    return (
                      <div
                        key={idx}
                        className="p-3 border rounded bg-white flex gap-4 items-center hover:bg-slate-50"
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
                        <div className="flex flex-col gap-1">
                          <select
                            value={selectedChild}
                            onChange={e => setSelectedChild(e.target.value)}
                            className="p-1 border rounded"
                          >
                            <option value="">Select Child</option>
                            {children.map(c => (
                              <option key={c.id} value={c.id}>{c.full_name} ({c.sex})</option>
                            ))}
                          </select>
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded"
                            onClick={() => handlePayToRegisterChild(teacherObj.id, it.subject, it.level, selectedChild)}
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
            <div className="mt-4">
              <h4 className="font-semibold">My Child’s Teachers</h4>
              <div className="space-y-3 mt-3">
                {myChildTeachers.length === 0 && <div className="text-slate-600">No registered teachers yet.</div>}
                {myChildTeachers.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 border rounded bg-gray-50 flex gap-4 items-center hover:bg-slate-50"
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

        </div>
      </div>
    </div>
  );
}
