// pages/index.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Banner from "../components/Banner";
import Link from "next/link";

export default function Home() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const fetchLocationAndTeachers = async () => {
      try {
        // 🌍 Detect location
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        let location = data?.city || data?.region || data?.country_name;

        // ✅ Normalize Accra → Greater Accra
        if (location?.toLowerCase() === "accra") {
          location = "Greater Accra";
        }

        setUserLocation(location);

        // 📚 Fetch teachers from Supabase
        const { data: teachersData, error } = await supabase
          .from("users")
          .select("id, full_name, profile_image, city, user_type")
          .eq("user_type", "teacher")
          .eq("city", location);

        if (error) throw error;

        // 🖼️ Use profile_image directly (already public URL) or fallback
        const teachersWithUrls =
          teachersData?.map((t) => ({
            ...t,
            image_url: t.profile_image || "/placeholder.png",
          })) || [];

        setTeachers(teachersWithUrls);
      } catch (err) {
        console.error("Error fetching teachers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationAndTeachers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Welcome to Home Teachers Ghana
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          Connecting students with qualified teachers across Ghana. 
          Search by subject, level, and location to find the perfect teacher for your needs.
        </p>

        {/* Teachers Nearby Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Teachers Nearby {userLocation && `in ${userLocation}`}
          </h2>

          {loading ? (
            <p className="text-gray-500">Loading teachers...</p>
          ) : teachers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {teachers.map((teacher) => (
                <Link href={`/teacher/${teacher.id}`} key={teacher.id}>
                  <a className="bg-white shadow rounded-lg p-4 flex flex-col items-center hover:shadow-md transition">
                    <img
                      src={teacher.image_url}
                      alt={teacher.full_name}
                      className="w-24 h-24 rounded-full object-cover mb-3 border"
                    />
                    <h3 className="text-lg font-medium text-gray-800">
                      {teacher.full_name}
                    </h3>
                    <p className="text-gray-500 text-sm">{teacher.city}</p>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No teachers found nearby.</p>
          )}
        </div>
      </div>
    </div>
  );
}
