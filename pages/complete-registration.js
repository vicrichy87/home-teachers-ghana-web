// pages/complete-registration.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function CompleteRegistration() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
      setName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");

      // Check if profile already exists
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, avatar_url")
        .eq("id", user.id)
        .single();

      if (!error && profile && profile.role) {
        // Already completed registration
        router.push("/");
      } else {
        setLoading(false);
      }
    };

    getUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Upload profile picture
    let avatarUrl = null;
    if (avatar) {
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(`public/${user.id}.png`, avatar, { upsert: true });

      if (error) {
        alert("Error uploading avatar: " + error.message);
      } else {
        avatarUrl = data.path;
      }
    }

    // Save profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      name,
      email,
      role,
      avatar_url: avatarUrl,
    });

    if (profileError) {
      alert("Error saving profile: " + profileError.message);
      return;
    }

    // Update password in Supabase Auth
    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      alert("Error setting password: " + pwError.message);
      return;
    }

    alert("Registration complete!");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Checking profile...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-sky-50">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white rounded-2xl shadow-md w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold">Complete Your Registration</h1>

        {/* Prefilled Name */}
        <input
          type="text"
          placeholder="Full Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Prefilled Email (readonly) */}
        <input
          type="email"
          className="w-full border p-2 rounded bg-gray-100"
          value={email}
          readOnly
        />

        {/* Role Selection */}
        <select
          className="w-full border p-2 rounded"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          <option value="">Select Role</option>
          <option value="Teacher">Teacher</option>
          <option value="Student">Student</option>
        </select>

        {/* Password */}
        <input
          type="password"
          placeholder="Set a password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Avatar Upload */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatar(e.target.files[0])}
        />

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
        >
          Save & Continue
        </button>
      </form>
    </div>
  );
}
