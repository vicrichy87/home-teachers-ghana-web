// pages/teacher/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function TeacherProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return; // wait until router is ready

    const fetchTeacher = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, profile_image, city, subjects, bio, user_type")
          .eq("id", id)
          .eq("user_type", "teacher")
          .single();

        if (error) throw error;
        setTeacher(data);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex flex-col items-center">
          <img
            src={
              teacher.avatar_url ||
              "https://via.placeholder.com/150?text=No+Image"
            }
            alt={teacher.full_name}
            className="w-32 h-32 rounded-full object-cover mb-4"
          />
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            {teacher.full_name}
          </h1>
          <p className="text-gray-600 mb-2">
            📍 {teacher.location || "Location not available"}
          </p>
          {teacher.subjects && (
            <p className="text-gray-700 mb-4">
              📚 <span className="font-medium">Subjects:</span> {teacher.subjects}
            </p>
          )}
          {teacher.bio && (
            <p className="text-gray-600 text-center">{teacher.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}
