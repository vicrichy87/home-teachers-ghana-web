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
    if (tab === "students") fetchStudents();
    if (tab === "myRates") fetchRates();
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
        rate: 200, // 👈 fixed amount
      }]);
      if (error) throw error;
      setSubject(""); 
      setLevel(""); 
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

      {tab === "rates" && (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          />

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          >
            <option value="">Select Level</option>
            <option value="JHS">JHS</option>
            <option value="SHS">SHS</option>
            <option value="Remedial">Remedial</option>
          </select>

          <div className="border px-3 py-2 rounded bg-gray-100">
            Fixed Rate: <strong>200</strong>
          </div>

          <button
            onClick={handleAddRate}
            disabled={savingRate}
            className="bg-sky-600 text-white px-4 py-2 rounded"
          >
            {savingRate ? "Saving..." : "Add Rate"}
          </button>
        </div>
      )}

      {/* ✅ Rest of profile, students, myRates remain unchanged */}
    </div>
  );
}
