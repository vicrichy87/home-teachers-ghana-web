// pages/teacher/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function TeacherProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [teacher, setTeacher] = useState(null);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTeacher = async () => {
      try {
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

    fetchTeacher();
  }, [id]);

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
