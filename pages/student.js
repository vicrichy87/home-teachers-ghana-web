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
  const [teachers, setTeachers] = useState([]);
  const [myTeachers, setMyTeachers] = useState([]);
  const [searchLocation, setSearchLocation] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchLevel, setSearchLevel] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  useEffect(() => {
    if (tab === "myTeachers" && student) fetchMyTeachers();
  }, [tab, student]);

  // 🌍 Auto-detect location from IP
  useEffect(() => {
    async function detectLocation() {
      try {
        const res = await fetch("https://ipapi.co/json/"); // free IP API
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

  // 🔍 Case-insensitive searches
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
            {["profile", "searchTeacher", "myTeachers"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded ${tab===t? "bg-sky-600 text-white":"bg-sky-50"}`}
              >
                {t==="profile" ? "Profile" : t==="searchTeacher"? "Search Teacher" : "My Teachers"}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab==="profile" && (
            <div className="mt-4">
              <div className="flex gap-4">
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
            </div>
          )}

          {/* Search Teacher Tab */}
          {tab==="searchTeacher" && (
            <div className="mt-4 space-y-4">
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
                              e.stopPropagation(); // prevent card click
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

        </div>
      </div>
    </div>
  );
}
