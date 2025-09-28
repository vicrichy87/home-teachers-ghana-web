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

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [rate, setRate] = useState("200");
  const [savingRate, setSavingRate] = useState(false);

  const [editingRate, setEditingRate] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editRate, setEditRate] = useState("");

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTeacherProfile();
  }, []);

  useEffect(() => {
    if (teacher) {
      if (tab === "students") fetchStudents();
      if (tab === "myRates") fetchRates();
    }
  }, [tab, teacher]);

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

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from("teacher_students")
        .select(`
          id,
          date_added,
          expiry_date,
          student:student_id ( full_name, email )
        `)
        .eq("teacher_id", teacher.id)
        .order("date_added", { ascending: false });
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
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

      setSubject("");
      setLevel("");
      setRate("200");

      // ✅ Refresh list after insert
      await fetchRates();
      setTab("myRates");
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

      // ✅ Refresh list after delete
      await fetchRates();
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

      setEditingRate(null);

      // ✅ Refresh list after update
      await fetchRates();
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  // ✅ Upload profile image
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

      {/* Profile */}
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

      {/* Students */}
      {tab === "students" && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">My Students</h2>
          {students.length === 0 ? (
            <p className="text-gray-500">No students yet.</p>
          ) : (
            <ul className="space-y-2">
              {students.map(s => (
                <li key={s.id} className="border p-3 rounded">
                  <div><strong>{s.student.full_name}</strong> ({s.student.email})</div>
                  <div>Joined: {new Date(s.date_added).toLocaleDateString()}</div>
                  <div>Expiry: {new Date(s.expiry_date).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Add Rates */}
      {tab === "rates" && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Add a New Rate</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="border p-2 rounded flex-1"
            />
            <input
              type="text"
              placeholder="Level"
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="border p-2 rounded flex-1"
            />
            <input
              type="number"
              placeholder="Rate"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="border p-2 rounded w-24"
            />
            <button
              onClick={handleAddRate}
              disabled={savingRate}
              className="bg-sky-600 text-white px-3 py-1 rounded"
            >
              {savingRate ? "Saving..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* My Rates */}
      {tab === "myRates" && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">My Rates</h2>
          {rates.length === 0 ? (
            <p className="text-gray-500">No rates yet.</p>
          ) : (
            <ul className="space-y-2">
              {rates.map(r => (
                <li key={r.id} className="border p-3 rounded flex justify-between items-center">
                  {editingRate === r.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        className="border p-1 rounded"
                      />
                      <input
                        type="text"
                        value={editLevel}
                        onChange={e => setEditLevel(e.target.value)}
                        className="border p-1 rounded"
                      />
                      <input
                        type="number"
                        value={editRate}
                        onChange={e => setEditRate(e.target.value)}
                        className="border p-1 rounded w-20"
                      />
                      <button
                        onClick={handleSaveEditRate}
                        className="bg-green-500 text-white px-2 rounded"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div>
                      <strong>{r.subject}</strong> – {r.level} – GHS {r.rate}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {editingRate !== r.id && (
                      <button
                        onClick={() => startEditRate(r)}
                        className="bg-yellow-500 text-white px-2 rounded"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRate(r.id)}
                      className="bg-red-500 text-white px-2 rounded"
                    >
                      Delete
                    </button>
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
