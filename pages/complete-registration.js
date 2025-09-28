// pages/complete-registration.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function CompleteRegistration() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [name, setName] = useState(""); // maps to full_name in DB
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState(""); // teacher or student
  const [dob, setDob] = useState(""); // date of birth
  const [sex, setSex] = useState(""); // male/female/other
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState(""); // ✅ new phone field

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ Fetch user on mount
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
      setDob(user.user_metadata?.dob || ""); // if provided by Google
      setSex(user.user_metadata?.sex || ""); // if provided by Google
      setCity(user.user_metadata?.city || "");
      setPhone(user.user_metadata?.phone || ""); // ✅ if available
    };

    getUser();
  }, [router]);

  // ✅ Auto-detect city from IP if empty
  useEffect(() => {
    const fetchCity = async () => {
      if (!city) {
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data?.city) {
            setCity(data.city);
          }
        } catch (err) {
          console.error("Failed to fetch city:", err);
        }
      }
    };
    fetchCity();
  }, [city]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // ✅ Password validation
    if (user.app_metadata?.provider === "email") {
      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }
    }

    setLoading(true);

    try {
      // --- Check if record exists ---
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let dbError = null;

      if (existingUser) {
        // Update existing row
        const { error } = await supabase
          .from("users")
          .update({
            full_name: name,
            email,
            user_type: userType,
            dob,
            sex,
            city,
            phone, // ✅ save phone
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
          dob,
          sex,
          city,
          phone, // ✅ insert phone
        });
        dbError = error;
      }

      if (dbError) throw dbError;

      // ✅ Only update password if email/password account
      if (user.app_metadata?.provider === "email" && password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      // Redirect based on role
      if (userType === "teacher") router.push("/teacher");
      else router.push("/student");
    } catch (err) {
      alert("Error saving profile: " + (err.message || String(err)));
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
          <option value="">Select User Type</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>

        {/* ✅ Added label for DOB */}
        <label className="block text-gray-700 font-medium">Date of Birth</label>
        <input
          type="date"
          className="w-full border p-2 rounded"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
        />

        <select
          className="w-full border p-2 rounded"
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          required
        >
          <option value="">Select Sex</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        {/* ✅ Phone number field */}
        <input
          type="tel"
          placeholder="Phone Number"
          className="w-full border p-2 rounded"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        {/* ✅ Auto-detected city but editable */}
        <input
          type="text"
          placeholder="City"
          className="w-full border p-2 rounded"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />

        {/* ✅ Only show password fields for email/password users */}
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
