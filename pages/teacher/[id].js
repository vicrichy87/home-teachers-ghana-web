// pages/teacher/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function TeacherProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [teacher, setTeacher] = useState(null);
  const [rates, setRates] = useState([]);
  const [student, setStudent] = useState(null);
  const [userType, setUserType] = useState(null); // ✅ Track whether user is student or teacher
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        // ✅ Get logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (userData) {
            setUserType(userData.user_type);
            if (userData.user_type === "student") {
              setStudent(userData);
            }
          }
        }

        // 🎓 Fetch teacher details
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, profile_image, city, email, phone, user_type")
          .eq("id", id)
          .eq("user_type", "teacher")
          .single();
        if (error) throw error;

        const teacherWithImage = {
          ...data,
          image_url: data?.profile_image || "/placeholder.png",
        };
        setTeacher(teacherWithImage);

        // 💰 Fetch teacher subjects + levels + rates
        const { data: ratesData, error: ratesError } = await supabase
          .from("teacher_rates")
          .select("id, subject, level, rate")
          .eq("teacher_id", id);
        if (ratesError) throw ratesError;

        setRates(ratesData || []);
      } catch (err) {
        console.error("Error fetching teacher:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ✅ Register student to teacher for a subject + level
  async function handlePayToRegister(teacherId, subject, level) {
    try {
      if (!student) return alert("You must be logged in as a student to register.");

      // 1️⃣ Check if already registered and not expired
      const { data: existing, error: checkError } = await supabase
        .from("teacher_students")
        .select("*")
        .eq("student_id", student.id)
        .eq("teacher_id", teacherId)
        .eq("subject", subject)
        .eq("level", level)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        const today = new Date().toISOString().split("T")[0];
        if (existing.expiry_date && existing.expiry_date >= today) {
          return alert("❌ You are already registered for this subject and level. Wait until it expires before registering again.");
        }
      }

      // 2️⃣ Insert new registration
      const dateAdded = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error } = await supabase.from("teacher_students").insert([
        {
          student_id: student.id,
          teacher_id: teacherId,
          subject,
          level,
          date_added: dateAdded.toISOString().split("T")[0],
          expiry_date: expiryDate.toISOString().split("T")[0],
        },
      ]);
      if (error) throw error;

      alert("✅ Successfully registered!");
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading teacher profile...
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Teacher not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      {/* Teacher Profile Card */}
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex flex-col items-center">
          <img
            src={teacher.image_url}
            alt={teacher.full_name}
            className="w-32 h-32 rounded-full object-cover mb-4 border"
          />
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            {teacher.full_name}
          </h1>
          <p className="text-gray-600 mb-2">
            📍 {teacher.city || "Location not available"}
          </p>
          {teacher.email && (
            <p className="text-gray-700 mb-2">
              📧 <span className="font-medium">Email:</span> {teacher.email}
            </p>
          )}
          {teacher.phone && (
            <p className="text-gray-600">📞 {teacher.phone}</p>
          )}
        </div>
      </div>

      {/* Subjects + Levels + Rates Table */}
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Subjects, Levels & Rates
        </h2>
        {rates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Subject</th>
                  <th className="px-4 py-2 border">Level</th>
                  <th className="px-4 py-2 border">Rate (GHC)</th>
                  <th className="px-4 py-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((row) => (
                  <tr key={row.id} className="text-center">
                    <td className="px-4 py-2 border">{row.subject}</td>
                    <td className="px-4 py-2 border">{row.level}</td>
                    <td className="px-4 py-2 border text-blue-600 font-medium">
                      {row.rate}
                    </td>
                    <td className="px-4 py-2 border">
                      {userType === "student" ? (
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded"
                          onClick={() =>
                            handlePayToRegister(teacher.id, row.subject, row.level)
                          }
                        >
                          Pay to Register
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">
                          Not available
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No subjects or rates available.</p>
        )}
      </div>
    </div>
  );
}
