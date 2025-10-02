// pages/register.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../components/Banner";
import Link from "next/link";

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
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-detect city
  useEffect(() => {
    const fetchCity = async () => {
      if (!city) {
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data?.city) setCity(data.city === "Accra" ? "Greater Accra" : data.city);
        } catch (err) {
          console.error("City fetch failed:", err);
        }
      }
    };
    fetchCity();
  }, [city]);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !phone.trim() || !sex || !dob || !userType || !password) {
      alert("Please fill all required fields");
      return;
    }

    if (password !== confirm) {
      alert("Passwords don't match");
      return;
    }

    if (!acceptTerms) {
      alert("You must accept the Privacy Policy and Terms & Conditions to register.");
      return;
    }

    setLoading(true);

    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      const userId = authData.user.id;

      // Insert into users table
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: userId,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          sex,
          dob,
          city,
          user_type: userType,
        },
      ]);
      if (insertError) throw insertError;

      // Redirect
      if (userType === "teacher") {
        router.push("/teacher");
      } else if (userType === "parent") {
        router.push("/parent");
      } else {
        router.push("/student");
      }

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
        <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2 border rounded" />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" />
        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border rounded" />

        <div className="flex gap-2">
          <select value={sex} onChange={(e) => setSex(e.target.value)} className="flex-1 p-2 border rounded">
            <option value="">Select sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="flex-1 p-2 border rounded" />
        </div>

        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-full p-2 border rounded" />

        <select value={userType} onChange={(e) => setUserType(e.target.value)} className="w-full p-2 border rounded">
          <option value="">Select user type</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
          <option value="parent">Parent</option>
        </select>

        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" />
        <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full p-2 border rounded" />

        <div className="flex items-start gap-2">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1" />
          <p className="text-sm text-gray-700">
            I agree to the{" "}
            <Link href="/privacy-policy" className="text-sky-600 underline">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/terms" className="text-sky-600 underline">Terms & Conditions</Link>
          </p>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-2 rounded">
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}
