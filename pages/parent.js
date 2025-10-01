import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ParentPage() {
  const [user, setUser] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [childTeachers, setChildTeachers] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");
  const [searchResults, setSearchResults] = useState([]);

  // 🔍 Search filters (same as student.js)
  const [searchType, setSearchType] = useState("location");
  const [location, setLocation] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let { data: userDetails } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        setUser(userDetails);

        if (userDetails?.profile_image) {
          const { data } = supabase.storage
            .from("profile-pictures")
            .getPublicUrl(userDetails.profile_image);
          setProfileImageUrl(data.publicUrl);
        }

        // fetch child's teachers
        let { data: teachers } = await supabase
          .from("parent_child_teachers")
          .select("teacher_id, users(full_name)")
          .eq("parent_id", user.id);

        setChildTeachers(teachers || []);
      }
    };
    fetchUser();
  }, []);

  const uploadProfilePicture = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Error uploading image: " + uploadError.message);
      return;
    }

    await supabase.from("users").update({ profile_image: filePath }).eq("id", user.id);

    const { data } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);
    setProfileImageUrl(data.publicUrl);

    alert("Profile picture uploaded!");
  };

  // 🔍 Handle search with Supabase queries (mirrors student.js)
  const handleSearch = async () => {
    let query = supabase.from("users").select("id, full_name, city, subject, level, profile_image").eq("user_type", "teacher");

    if (searchType === "location" && location.trim()) {
      query = query.ilike("city", `%${location}%`);
    } else if (searchType === "subject" && subject.trim()) {
      query = query.ilike("subject", `%${subject}%`);
    } else if (searchType === "subject-level" && subject.trim() && level.trim()) {
      query = query.ilike("subject", `%${subject}%`).ilike("level", `%${level}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Search error:", error.message);
      setSearchResults([]);
    } else {
      setSearchResults(data || []);
    }
  };

  return (
    <div className="p-6">
      {user && (
        <>
          <h2 className="text-2xl font-bold mb-6">Parent Dashboard</h2>

          {/* Tabs (equal width like student.js) */}
          <div className="flex gap-2 mb-6 border-b pb-2">
            <button
              className={`flex-1 px-3 py-2 rounded ${
                activeTab === "profile" ? "bg-emerald-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button
              className={`flex-1 px-3 py-2 rounded ${
                activeTab === "search" ? "bg-emerald-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("search")}
            >
              Search Teachers
            </button>
            <button
              className={`flex-1 px-3 py-2 rounded ${
                activeTab === "teachers" ? "bg-emerald-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("teachers")}
            >
              My Child’s Teachers
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div>
              <div className="mb-6">
                <img
                  src={profileImageUrl || "/default-avatar.png"}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover mb-3"
                />
                <input type="file" accept="image/*" onChange={uploadProfilePicture} />
              </div>
              <div className="space-y-2">
                <p><strong>Parent Name:</strong> {user.full_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phone}</p>
                <p><strong>Location:</strong> {user.city}</p>
                <p><strong>Sex:</strong> {user.sex}</p>
                <p><strong>DOB:</strong> {user.dob}</p>
                <p><strong>Child’s Name:</strong> {user.child_name}</p>
                <p><strong>Child’s Sex:</strong> {user.child_sex}</p>
                <p><strong>Child’s DOB:</strong> {user.child_dob}</p>
              </div>
            </div>
          )}

          {/* Search Teachers Tab */}
          {activeTab === "search" && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Search Teachers</h3>

              {/* Search options */}
              <div className="flex gap-4 mb-4">
                <label>
                  <input
                    type="radio"
                    value="location"
                    checked={searchType === "location"}
                    onChange={() => setSearchType("location")}
                  />
                  <span className="ml-2">By Location</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="subject"
                    checked={searchType === "subject"}
                    onChange={() => setSearchType("subject")}
                  />
                  <span className="ml-2">By Subject</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="subject-level"
                    checked={searchType === "subject-level"}
                    onChange={() => setSearchType("subject-level")}
                  />
                  <span className="ml-2">By Subject + Level</span>
                </label>
              </div>

              {/* Inputs */}
              {searchType === "location" && (
                <input
                  type="text"
                  placeholder="Enter location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border px-3 py-2 rounded w-full mb-3"
                />
              )}

              {searchType === "subject" && (
                <input
                  type="text"
                  placeholder="Enter subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="border px-3 py-2 rounded w-full mb-3"
                />
              )}

              {searchType === "subject-level" && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Enter subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="border px-3 py-2 rounded w-1/2"
                  />
                  <input
                    type="text"
                    placeholder="Enter level..."
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="border px-3 py-2 rounded w-1/2"
                  />
                </div>
              )}

              <button
                onClick={handleSearch}
                className="bg-emerald-500 text-white px-4 py-2 rounded"
              >
                Search
              </button>

              {/* Results */}
              <div className="mt-4">
                {searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((t) => {
                      const { data } = supabase.storage
                        .from("profile-pictures")
                        .getPublicUrl(t.profile_image || "");
                      return (
                        <li
                          key={t.id}
                          className="border p-3 rounded mb-2 flex items-center gap-3"
                        >
                          <img
                            src={t.profile_image ? data.publicUrl : "/default-avatar.png"}
                            alt={t.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium">{t.full_name}</p>
                            <p className="text-sm text-gray-500">{t.city}</p>
                            <p className="text-sm text-gray-400">
                              {t.subject} {t.level && `(${t.level})`}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No teachers found.</p>
                )}
              </div>
            </div>
          )}

          {/* My Child’s Teachers Tab */}
          {activeTab === "teachers" && (
            <div>
              <h3 className="text-lg font-semibold mb-3">My Child’s Teachers</h3>
              {childTeachers.length > 0 ? (
                <ul>
                  {childTeachers.map((ct) => (
                    <li key={ct.teacher_id} className="border p-2 rounded mb-2">
                      {ct.users.full_name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No teachers registered yet.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
