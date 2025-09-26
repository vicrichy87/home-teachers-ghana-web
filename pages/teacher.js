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
      const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single();
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
      const { data, error } = await supabase.from("teacher_rates").select("id, subject, level, rate").eq("teacher_id", teacher.id).order("id", {ascending:false});
      if (error) throw error;
      setRates(data || []);
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  async function handleAddRate(){
    if(!subject || !level) return alert("Provide subject and level");
    setSavingRate(true);
    try {
      const { error } = await supabase.from("teacher_rates").insert([{
        teacher_id: teacher.id,
        subject,
        level,
        rate: parseFloat(rate)
      }]);
      if (error) throw error;
      setSubject(""); setLevel(""); setRate("200");
      fetchRates();
    } catch (err){
      alert(err.message || String(err));
    } finally { setSavingRate(false); }
  }

  async function handleDeleteRate(id){
    try {
      const { error } = await supabase.from("teacher_rates").delete().eq("id", id);
      if (error) throw error;
      setRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  function startEditRate(item){
    setEditingRate(item.id);
    setEditSubject(item.subject);
    setEditLevel(item.level);
    setEditRate(String(item.rate));
  }

  async function handleSaveEditRate(){
    if(!editSubject || !editLevel) return alert("Fill fields");
    try {
      const { error } = await supabase.from("teacher_rates").update({
        subject: editSubject,
        level: editLevel,
        rate: parseFloat(editRate)
      }).eq("id", editingRate);
      if (error) throw error;
      setRates(prev => prev.map(r => r.id === editingRate ? {...r, subject:editSubject, level:editLevel, rate:parseFloat(editRate)} : r));
      setEditingRate(null);
    } catch (err) { alert(err.message || String(err)) }
  }

  async function handlePickImage(file) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const filePath = `profile_images/${user.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("profile_images").upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = await supabase.storage.from("profile_images").getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;
      const { error: updateError } = await supabase.from("users").update({ profile_image: publicUrl }).eq("id", user.id);
      if (updateError) throw updateError;
      setTeacher(prev => ({...prev, profile_image: publicUrl}));
      alert("Profile image updated");
    } catch (err) {
      alert(err.message || String(err));
    } finally { setUploading(false) }
  }

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <Banner />
      <div className="mt-4 flex gap-3">
        {["profile","students","rates","myRates"].map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded ${tab===t? "bg-sky-600 text-white":"bg-sky-50"}`}>
            {t==="profile"? "Profile" : t==="students"? "View Students" : t==="rates"? "Add Rates":"My Rates"}
          </button>
        ))}
      </div>

      {tab==="profile" && (
        <div className="mt-4 flex gap-6">
          <div>
            <img src={teacher?.profile_image || "/placeholder.png"} className="w-28 h-28 rounded-full border" />
            <div className="mt-2">
              <label className="bg-sky-600 text-white px-3 py-1 rounded cursor-pointer">
                {uploading ? "Uploading..." : "Change Photo"}
                <input type="file" className="hidden" onChange={(e)=> handlePickImage(e.target.files[0])} />
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

      {tab==="students" && (
        <div className="mt-4">
          <h3 className="font-semibold">Students</h3>
          <div className="space-y-3 mt-3">
            {students.length===0 && <div>No students yet.</div>}
            {students.map(s => (
              <div key={s.id} className="border p-3 rounded">
                <div className="font-semibold">{s.student.full_name}</div>
                <div>{s.student.email}</div>
                <div>Date added: {s.date_added} — Expiry: {s.expiry_date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="rates" && (
        <div className="mt-4">
          <input placeholder="Subject" value={subject} onChange={(e)=>setSubject(e.target.value)} className="w-full p-2 border rounded" />
          <div className="flex gap-2 mt-2">
            <select value={level} onChange={(e)=>setLevel(e.target.value)} className="p-2 border rounded">
              <option value="">Select level</option>
              <option value="JHS">JHS</option>
              <option value="SHS">SHS</option>
              <option value="Remedial">Remedial</option>
            </select>
            <input value={rate} onChange={(e)=>setRate(e.target.value)} className="p-2 border rounded" placeholder="Rate GHC" />
            <button onClick={handleAddRate} className="bg-emerald-600 text-white px-4 py-2 rounded">{savingRate? "Saving...": "Add Rate"}</button>
          </div>
        </div>
      )}

      {tab==="myRates" && (
        <div className="mt-4 space-y-3">
          {rates.length===0 && <div>No rates</div>}
          {rates.map(item => editingRate === item.id ? (
            <div className="p-3 border rounded" key={item.id}>
              <input value={editSubject} onChange={(e)=>setEditSubject(e.target.value)} className="w-full p-2 border rounded" />
              <div className="flex gap-2 mt-2">
                <select value={editLevel} onChange={(e)=>setEditLevel(e.target.value)} className="p-2 border rounded">
                  <option value="">Select</option>
                  <option value="JHS">JHS</option>
                  <option value="SHS">SHS</option>
                  <option value="Remedial">Remedial</option>
                </select>
                <input value={editRate} onChange={(e)=>setEditRate(e.target.value)} className="p-2 border rounded" />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleSaveEditRate} className="bg-sky-600 text-white px-3 py-1 rounded">Save</button>
                <button onClick={()=>setEditingRate(null)} className="bg-gray-300 px-3 py-1 rounded">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="p-3 border rounded" key={item.id}>
              <div className="font-semibold">{item.subject}</div>
              <div>{item.level} — GHC {item.rate}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>startEditRate(item)} className="bg-sky-600 text-white px-3 py-1 rounded">Edit</button>
                <button onClick={()=>handleDeleteRate(item.id)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
