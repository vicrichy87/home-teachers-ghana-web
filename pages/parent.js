import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ParentPage() {
  const [user, setUser] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [childTeachers, setChildTeachers] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");

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
            .from("profile-pictures") // ✅ correct bucket
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

  const uploadChildPicture = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    // unique path per user
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures") // ✅ correct bucket
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Error uploading image: " + uploadError.message);
      return;
    }

    // update user record
    await supabase.from("users").update({ profile_image: filePath }).eq("id", user.id);

    const { data } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);
    setProfileImageUrl(data.publicUrl);

    alert("Profile picture uploaded!");
  };

  return (
    <div className="p-6">
      {user && (
        <>
          <h2 className="text-2xl font-bold mb-6">Parent Dashboard</h2>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b pb-2">
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "profile" ? "bg-emerald-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "teachers" ? "bg-emerald-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("teachers")}
            >
              My Child’s Teachers
            </button>
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "payments" ? "bg-emerald-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("payments")}
            >
              Payments
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div>
              <div className="mb-6">
                <img
                  src={profileImageUrl || "/default-avatar.png"}
                  alt="Child profile"
                  className="w-32 h-32 rounded-full object-cover mb-3"
                />
                <input type="file" accept="image/*" onChange={uploadChildPicture} />
              </div>
              <div className="space-y-2">
                <p>
                  <strong>Parent Name:</strong> {user.full_name}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Phone:</strong> {user.phone}
                </p>
                <p>
                  <strong>Location:</strong> {user.city}
                </p>
                <p>
                  <strong>Sex:</strong> {user.sex}
                </p>
                <p>
                  <strong>DOB:</strong> {user.dob}
                </p>
                <p>
                  <strong>Child’s Name:</strong> {user.child_name}
                </p>
                <p>
                  <strong>Child’s Sex:</strong> {user.child_sex}
                </p>
                <p>
                  <strong>Child’s DOB:</strong> {user.child_dob}
                </p>
              </div>
            </div>
          )}

          {/* Teachers Tab */}
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

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Payments</h3>
              <button className="px-4 py-2 bg-green-500 text-white rounded-lg">
                Pay to register Child
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
