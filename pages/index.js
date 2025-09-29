import { useEffect, useState } from "react";
import Link from "next/link";
import Banner from "../components/Banner";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [teachers, setTeachers] = useState([]);
  const [country, setCountry] = useState({ name: "", code: "" });

  useEffect(() => {
    // 🌍 Detect location
    const fetchLocation = async () => {
      try {
        const cached = localStorage.getItem("user_country");
        let newCountry;
        if (cached) {
          newCountry = JSON.parse(cached);
        } else {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data?.country_name) {
            newCountry = { name: data.country_name, code: data.country };
          } else {
            newCountry = { name: "World", code: "🌍" };
          }
          localStorage.setItem("user_country", JSON.stringify(newCountry));
        }
        setCountry(newCountry);

        // Fetch teachers in that location
        if (newCountry?.name) {
          const { data, error } = await supabase
            .from("users")
            .select("id, full_name, avatar_url, location, user_type")
            .eq("user_type", "teacher")
            .ilike("location", `%${newCountry.name}%`);

          if (error) throw error;
          setTeachers(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch teachers:", err);
      }
    };
    fetchLocation();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Welcome to Home Teachers Ghana
        </h1>
        <p className="text-lg text-gray-700">
          Connecting students with qualified teachers across Ghana. Search by
          subject, level, and location to find the perfect teacher for your
          needs.
        </p>
      </div>

      {/* Teachers Nearby Section */}
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Teachers Nearby {country?.name ? `in ${country.name}` : ""}
        </h2>
        {teachers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {teachers.map((teacher) => (
              <Link key={teacher.id} href={`/teacher/${teacher.id}`}>
                <a className="bg-white shadow rounded-lg p-4 flex flex-col items-center hover:shadow-lg transition">
                  <img
                    src={
                      teacher.avatar_url ||
                      "https://via.placeholder.com/150?text=No+Image"
                    }
                    alt={teacher.full_name}
                    className="w-24 h-24 rounded-full object-cover mb-3"
                  />
                  <p className="font-medium text-gray-700">
                    {teacher.full_name}
                  </p>
                </a>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            No teachers found nearby yet.
          </p>
        )}
      </div>
    </div>
  );
}
