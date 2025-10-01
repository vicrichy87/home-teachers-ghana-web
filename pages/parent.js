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
  const [searchLocation, setSearchLocation] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchLevel, setSearchLevel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [newChild, setNewChild] = useState({ full_name: "", sex: "", dob: "" });

  useEffect(() => { fetchParentProfile(); }, []);
  useEffect(() => { if (tab === "myChildTeachers" && parent) fetchMyChildTeachers(); }, [tab, parent]);
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

  // Fetch parent profile with children
  async function fetchParentProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          children:parents_children (*)
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setParent(data);
    } catch (err) { alert(err.message || String(err)); }
    finally { setLoading(false); }
  }

  // Fetch all child-teacher registrations
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
  async function handlePayToRegisterChild(teacherId, subject, level) {
    try {
      if (!parent) return alert("Parent not found");

      const dateAdded = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error } = await supabase.from("parent_child_teachers").insert([
        {
          parent_id: parent.id,
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

  // ✅ Add new child
  async function handleAddChild() {
    try {
      if (!parent) return alert("Parent not found");
      if (!newChild.full_name || !newChild.sex || !newChild.dob)
        return alert("Please fill all fields");

      const dateAdded = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase.from("parents_children").insert([
        {
          parent_id: parent.id,
          full_name: newChild.full_name,
          sex: newChild.sex,
          dob: newChild.dob,
          date_added: dateAdded,
        },
      ]).select();

      if (error) throw error;

      // Update parent state to immediately show new child
      setParent(prev => ({
        ...prev,
        children: prev.children ? [...prev.children, data[0]] : [data[0]]
      }));

      alert("Child added successfully!");
      setNewChild({ full_name: "", sex: "", dob: "" });
      setShowAddChildForm(false);
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
                <div className="flex-1">
                  <div><strong>Parent:</strong> {parent.full_name}</div>
                  <div><strong>Email:</strong> {parent.email}</div>
                  <div><strong>Phone:</strong> {parent.phone}</div>
                  <div><strong>City:</strong> {parent.city}</div>
                  <div><strong>Sex:</strong> {parent.sex}</div>
                  <div><strong>DOB:</strong> {parent.dob}</div>

                  {/* Add New Child */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddChildForm(prev => !prev)}
                      className="bg-green-600 text-white px-4 py-2 rounded mb-2"
                    >
                      {showAddChildForm ? "Hide Add Child Form" : "Add New Child"}
                    </button>

                    {showAddChildForm && (
                      <div className="p-3 border rounded bg-gray-50 mt-2">
                        <h5 className="font-semibold mb-2">Add New Child</h5>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={newChild.full_name}
                          onChange={e => setNewChild({...newChild, full_name: e.target.value})}
                          className="w-full p-2 border rounded mb-2"
                        />
                        <select
                          value={newChild.sex}
                          onChange={e => setNewChild({...newChild, sex: e.target.value})}
                          className="w-full p-2 border rounded mb-2"
                        >
                          <option value="">Select Sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <input
                          type="date"
                          value={newChild.dob}
                          onChange={e => setNewChild({...newChild, dob: e.target.value})}
                          className="w-full p-2 border rounded mb-2"
                        />
                        <button
                          type="button"
                          onClick={handleAddChild}
                          className="bg-green-600 text-white px-4 py-2 rounded"
                        >
                          Add Child
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Live Children List */}
                  <div className="mt-4">
                    <h5 className="font-semibold mb-2">Your Children</h5>
                    {parent.children && parent.children.length > 0 ? (
                      <ul className="space-y-2">
                        {parent.children.map(child => (
                          <li
                            key={child.id}
                            className="p-2 border rounded bg-gray-100"
                          >
                            <div><strong>Name:</strong> {child.full_name}</div>
                            <div><strong>Sex:</strong> {child.sex}</div>
                            <div><strong>DOB:</strong> {child.dob}</div>
                            <div className="text-xs text-slate-500">Added: {new Date(child.date_added).toLocaleDateString()}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-slate-600">No children added yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Teachers Tab */}
          {tab==="searchTeacher" && (
            <div className="mt-4 space-y-4">
              {/* Location & Subject Search UI (unchanged) */}
              {/* ... keep existing code for search teachers ... */}
            </div>
          )}

          {/* My Child’s Teachers Tab */}
          {tab==="myChildTeachers" && (
            <div className="mt-4">
              {/* Existing code unchanged */}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
