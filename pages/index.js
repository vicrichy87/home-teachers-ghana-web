// pages/index.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Banner from "../components/Banner";
import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";


export default function Home() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  // 🔹 Special requests
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🌍 Detect location
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        let location = data?.city || data?.region || data?.country_name;

        if (location?.toLowerCase() === "accra") {
          location = "Greater Accra";
        }

        setUserLocation(location);

        // 📚 Fetch teachers
        const { data: teachersData, error } = await supabase
          .from("users")
          .select("id, full_name, profile_image, city, user_type")
          .eq("user_type", "teacher")
          .eq("city", location);

        if (error) throw error;

        const teachersWithUrls =
          teachersData?.map((t) => ({
            ...t,
            image_url: t.profile_image || "/placeholder.png",
          })) || [];

        setTeachers(teachersWithUrls);

        // 👤 Fetch logged-in user
        const { data: authData } = await supabase.auth.getUser();
        setUser(authData?.user || null);

        // 📝 Fetch latest special requests
        const { data: requestsData, error: reqError } = await supabase
          .from("requests")
          .select("id, request_text, user_id, city, created_at")
          .order("created_at", { ascending: false })
          .limit(20);

        if (reqError) throw reqError;
        setRequests(requestsData || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔹 Teacher applies for request
  const handleApplyRequest = async (requestId) => {
    if (!user) {
      alert("You must be logged in as a teacher to apply.");
      return;
    }

    if (user.user_metadata?.user_type !== "teacher") {
      alert("Only teachers can apply for requests.");
      return;
    }

    const { error } = await supabase.from("request_applications").insert({
      request_id: requestId,
      teacher_id: user.id,
    });

    if (error) {
      console.error("Error applying for request:", error);
      alert("Error applying: " + error.message);
    } else {
      alert("Application submitted successfully!");
      setSelectedRequest(null); // close modal
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />

      {/* 🔹 Scroll Bar with Requests */}
      <div className="bg-blue-100 py-2 overflow-x-auto whitespace-nowrap">
        <div className="flex space-x-6 px-4">
          {requests.length > 0 ? (
            requests.map((req) => (
              <button
                key={req.id}
                className="flex items-center space-x-2 text-sm text-blue-700 hover:underline truncate max-w-xs"
                onClick={() => setSelectedRequest(req)}
              >
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{req.request_text || "No request text"}</span>
              </button>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No requests yet.</p>
          )}
        </div>
      </div>

      {/* 🔹 Modal for Request Details */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-bold mb-2">Special Request</h2>
            <p className="mb-2 text-gray-700">
              <strong>Location:</strong> {selectedRequest.city}
            </p>
            <p className="mb-4">{selectedRequest.request_text}</p>
            <div className="flex justify-end space-x-3">
              <button
                className="bg-gray-400 px-4 py-2 rounded text-white"
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </button>
              {user?.user_metadata?.user_type === "teacher" && (
                <button
                  className="bg-green-600 px-4 py-2 rounded text-white"
                  onClick={() => handleApplyRequest(selectedRequest.id)}
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Welcome to Home Teachers Ghana
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          Connecting students with qualified teachers across Ghana. Search by
          subject, level, and location to find the perfect teacher for your
          needs.
        </p>

        {/* Teachers Nearby Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Teachers Nearby {userLocation && `in ${userLocation}`}
          </h2>

          {loading ? (
            <p className="text-gray-500">Loading teachers...</p>
          ) : teachers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teachers.map((teacher) => (
                <Link href={`/teacher/${teacher.id}`} key={teacher.id}>
                  <a className="bg-white shadow rounded-lg p-3 flex flex-col items-center hover:shadow-md transition">
                    <img
                      src={teacher.image_url}
                      alt={teacher.full_name}
                      className="w-20 h-20 rounded-full object-cover mb-3 border"
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
