// pages/register.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../components/Banner";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sex, setSex] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [userType, setUserType] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Auto-detect city on mount
  useEffect(() => {
    const fetchCity = async () => {
      if (!city) {
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data?.city) {
            // Normalize: if Accra → Greater Accra
            setCity(data.city === "Accra" ? "Greater Accra" : data.city);
          }
        } catch (err) {
          console.error("Failed to auto-detect city:", err);
        }
      }
    };
    fetchCity();
  }, [city]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !sex || !dob || !city || !userType || !password) {
      alert("Please fill all fields");
      return;
    }
    if (password !== confirm) return alert("Passwords don't match");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      const userId = data.user.id;

      const { error: insertError } = await supabase.from("users").insert([
        {
          id: userId,
          full_name: fullName,
          email,
          phone,
          sex,
          dob,
          city,
          user_type: userType,
          profile_image: null,
        },
      ]);
      if (insertError) throw insertError;

      alert("Registration successful. Please login.");
      router.push("/login");
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <Banner />
      <h2 className="text-xl font-semibold mt-4">Register</h2>

      <form className="mt-4 space-y-3" onSubmit={handleRegister}>
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <div className="flex gap-2">
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="flex-1 p-2 border rounded"
          >
            <option value="">Select sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
        </div>

        {/* ✅ City is auto-filled but still editable */}
        <input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <select
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select user type</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-2 rounded"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}
