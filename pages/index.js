import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Banner from "../components/Banner";
import Link from "next/link";

export default function Home() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  
  // 🔹 Requests
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [applicationForm, setApplicationForm] = useState({ monthly_rate: "" });
  const [hasApplied, setHasApplied] = useState(false);


  const [user, setUser] = useState(null);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🌍 Detect location
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        let location = data?.city || data?.region || data?.country_name;
        if (location?.toLowerCase() === "accra") location = "Greater Accra";
        setUserLocation(location);

        // 📚 Fetch teachers nearby
        const { data: teachersData, error: teachersError } = await supabase
          .from("users")
          .select("id, full_name, profile_image, city, user_type")
          .eq("user_type", "teacher")
          .eq("city", location);

        if (teachersError) throw teachersError;

        setTeachers(
          teachersData?.map((t) => ({
            ...t,
            image_url: t.profile_image || "/placeholder.png",
          })) || []
        );

        // 👤 Get logged-in user
        const { data: authData } = await supabase.auth.getUser();
        const loggedUser = authData?.user || null;
        setUser(loggedUser);

        if (loggedUser) {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("id, full_name, user_type")
            .eq("id", loggedUser.id)
            .single();

          if (profileError) throw profileError;
          setIsTeacher(profileData.user_type?.toLowerCase() === "teacher");
        }

        // 📝 Fetch latest requests
        const { data: requestsData, error: reqError } = await supabase
          .from("requests")
          .select("id, request_text, user_id, city, created_at, status")
          .order("created_at", { ascending: false })
          .limit(20);

        if (reqError) throw reqError;

        // ✅ Only show pending requests
        const pendingRequests = requestsData?.filter(r => r.status !== "fulfilled") || [];
        setRequests(pendingRequests);

        setFilteredRequests(isTeacher ? pendingRequests.filter(r => r.id) : pendingRequests);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 🔹 Real-time subscription for requests
    const channel = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        (payload) => {
          console.log("Realtime request change:", payload);

          if (payload.eventType === "INSERT") {
            // Add new request if not fulfilled
            if (payload.new.status !== "fulfilled") {
              setRequests((prev) => [payload.new, ...prev]);
              setFilteredRequests((prev) => [payload.new, ...prev]);
            }
          }

          if (payload.eventType === "UPDATE") {
            if (payload.new.status === "fulfilled") {
              // Remove from list if fulfilled
              setRequests((prev) => prev.filter((r) => r.id !== payload.new.id));
              setFilteredRequests((prev) => prev.filter((r) => r.id !== payload.new.id));
            } else {
              // Otherwise update text/status if edited
              setRequests((prev) =>
                prev.map((r) => (r.id === payload.new.id ? payload.new : r))
              );
              setFilteredRequests((prev) =>
                prev.map((r) => (r.id === payload.new.id ? payload.new : r))
              );
            }
          }

          if (payload.eventType === "DELETE") {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
            setFilteredRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isTeacher]);

  // 🔹 Teacher applies for request
  const handleApplyForRequest = async () => {
  try {
    if (!isTeacher) {
      alert("Only teachers can apply for requests.");
      return;
    }
    if (!selectedRequest?.id) {
      alert("No request selected.");
      return;
    }
    if (!applicationForm.monthly_rate || isNaN(applicationForm.monthly_rate)) {
      alert("Please enter a valid monthly rate.");
      return;
    }

    console.log("📌 Applying for request:", {
      request_id: selectedRequest.id,
      teacher_id: user?.id,
      monthly_rate: applicationForm.monthly_rate,
    });

    const { error: insertError } = await supabase
      .from("request_applications")
      .insert([
        {
          request_id: selectedRequest.id,
          teacher_id: user.id,
          monthly_rate: parseFloat(applicationForm.monthly_rate),
          status: "pending",
          date_applied: new Date().toISOString(),
        },
      ]);

    if (insertError) throw insertError;

    alert("Application submitted successfully!");
    setSelectedRequest(null);
    setApplicationForm({ monthly_rate: "" });
  } catch (err) {
    console.error("Error applying for request:", err);
    alert("Error submitting application: " + (err.message || err));
  }
};

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />

      {/* 🔹 Scroll Bar with Requests */}
      <div className="bg-blue-100 py-2 marquee-container">
        <div className="marquee-content">
          {filteredRequests.length > 0 ? (
            filteredRequests.concat(filteredRequests).map((req, index) => (
              <button
                key={`${req.id}-${index}`}
                className="text-sm text-blue-700 hover:underline flex items-center mr-8"
                onClick={async () => {
                  setSelectedRequest(req);
                  setApplicationForm({ monthly_rate: "" });
                
                  // Check if teacher already applied
                  if (isTeacher && user?.id) {
                    try {
                      const { data: existingApp, error } = await supabase
                        .from("request_applications")
                        .select("id")
                        .eq("request_id", req.id)
                        .eq("teacher_id", user.id)
                        .single();
                
                      if (error && error.code !== "PGRST116") throw error;
                
                      setHasApplied(!!existingApp);
                    } catch (err) {
                      console.error("Error checking application:", err);
                      setHasApplied(false);
                    }
                  } else {
                    setHasApplied(false);
                  }
                }}
              >
                <span className="mr-1">⚠️</span>
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
            <p className="mb-4">{selectedRequest.request_text}</p>

            {isTeacher && (
              <div className="mb-4">
                <label className="block mb-1 font-medium">
                  Your Monthly Rate (GHC)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded"
                  value={applicationForm.monthly_rate}
                  onChange={(e) =>
                    setApplicationForm({
                      ...applicationForm,
                      monthly_rate: e.target.value,
                    })
                  }
                  placeholder="Enter your monthly rate"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                className="bg-gray-400 px-4 py-2 rounded text-white"
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </button>

              {isTeacher && (
                <button
                  className="bg-green-600 px-4 py-2 rounded text-white"
                  onClick={handleApplyForRequest}
                  disabled={hasApplied}
                >
                  {hasApplied ? "Already Applied" : "Apply for Request"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teachers Section */}
      <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Welcome to Home Teachers Ghana
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          Connecting students with qualified teachers across Ghana. Search by
          subject, level, and location to find the perfect teacher for your
          needs.
        </p>

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
