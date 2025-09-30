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

  // Child info for parents
  const [childName, setChildName] = useState("");
  const [childSex, setChildSex] = useState("");
  const [childDob, setChildDob] = useState("");

  // Auto-detect city
  useEffect(() => {
    const fetchCity = async () => {
      if (!city) {
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data?.city) {
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

    // Validate fields
    if (!fullName || !email || !phone || !userType || !password) {
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

    // If parent, validate child info
    if (userType === "parent" && (!childName || !childSex || !childDob)) {
      alert("Please provide your child's name, sex, and date of birth");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Sign up user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      const userId = data.user.id;

      if (userType === "parent") {
        // 2️⃣ Insert child as student
        const { data: child, error: childError } = await supabase
          .from("users")
          .insert([
            {
              full_name: childName,
              sex: childSex,
              dob: childDob,
              user_type: "student",
              city,
            },
          ])
          .single();
        if (childError) throw childError;

        // 3️⃣ Insert parent into parents table
        const { error: parentError } = await supabase
          .from("parents")
          .insert([
            {
              user_id: userId, // auth id
              full_name: fullName,
              email,
              phone,
              child_id: child.id,
            },
          ]);
        if (parentError) throw parentError;
      } else {
        // Regular student/teacher/admin
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
      }

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
          required
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 border rounded"
          required
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
          <option value="parent">Parent</option>
        </select>

        {/* Parent child info */}
        {userType === "parent" && (
          <div className="p-4 border rounded bg-gray-50 space-y-3">
            <h3 className="font-semibold">Child Information</h3>
            <input
              placeholder="Child's Name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <select
              value={childSex}
              onChange={(e) => setChildSex(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <input
              type="date"
              value={childDob}
              onChange={(e) => setChildDob(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1"
          />
          <p className="text-sm text-gray-700">
            I agree to the{" "}
            <Link href="/privacy-policy" className="text-sky-600 underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-sky-600 underline">
              Terms & Conditions
            </Link>
          </p>
        </div>

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
