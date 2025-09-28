// pages/complete-registration.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function CompleteRegistration() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [name, setName] = useState(""); // local form state
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState(""); // "teacher" or "student"
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // Fetch user client-side just for display and guard the page
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
    };

    getUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // If it's an email/password account, require matching passwords
    const isEmailProvider = user?.app_metadata?.provider === "email";

    if (isEmailProvider) {
      if (!password || password !== confirmPassword) {
        alert("Passwords do not match or are empty!");
        return;
      }
    }

    setLoading(true);

    try {
      // Use maybeSingle to avoid throwing when no row exists
      const { data: existingUser, error: existingError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      let dbError = null;

      if (existingUser) {
        // Update existing row - map local `name` -> `full_name` column
        const { error } = await supabase
          .from("users")
          .update({
            full_name: name,
            email,
            user_type: userType,
          })
          .eq("id", user.id);
        dbError = error;
      } else {
        // Insert new row
        const { error } = await supabase.from("users").insert({
          id: user.id,
          full_name: name,
          email,
          user_type: userType,
        });
        dbError = error;
      }

      if (dbError) throw dbError;

      // Update password only for email/password accounts
      if (isEmailProvider && password) {
        const { error: pwError } = await supabase.auth.updateUser({
          password,
        });
        if (pwError) throw pwError;
      }

      // Redirect based on role
      if (userType === "teacher") router.push("/teacher");
      else router.push("/student");
    } catch (err) {
      // Show helpful error
      alert("Error saving profile: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-sky-50">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white rounded-2xl shadow-md w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold">Complete Your Registration</h1>

        <input
          type="text"
          placeholder="Full Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          className="w-full border p-2 rounded bg-gray-100"
          value={email}
          readOnly
        />

        <select
          className="w-full border p-2 rounded"
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          required
        >
          <option value="">Select Role</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>

        {/* Password fields only for email/password users */}
        {user?.app_metadata?.provider === "email" && (
          <>
            <input
              type="password"
              placeholder="Set a password"
              className="w-full border p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirm password"
              className="w-full border p-2 rounded"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}

// Server-side protection using auth-helpers so OAuth redirects work
export async function getServerSideProps(ctx) {
  const supabaseServer = createServerSupabaseClient(ctx);

  const {
    data: { session },
  } = await supabaseServer.auth.getSession();

  if (!session) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  // Check if user already registered
  const { data: profile } = await supabaseServer
    .from("users")
    .select("user_type")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profile?.user_type) {
    return {
      redirect: {
        destination: profile.user_type === "teacher" ? "/teacher" : "/student",
        permanent: false,
      },
    };
  }

  return { props: {} };
}
