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

  // Helper to generate a UUID v4 in browsers and fallbacks
  function generateUUID() {
    try {
      // 1) Prefer native randomUUID if present
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }

      // 2) Use crypto.getRandomValues when available (browser)
      if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        // Per RFC4122 v4 rules
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant

        const byteToHex = [];
        for (let i = 0; i < 256; ++i) {
          byteToHex.push((i + 0x100).toString(16).substr(1));
        }

        return (
          byteToHex[bytes[0]] + byteToHex[bytes[1]] + byteToHex[bytes[2]] + byteToHex[bytes[3]] + "-" +
          byteToHex[bytes[4]] + byteToHex[bytes[5]] + "-" +
          byteToHex[bytes[6]] + byteToHex[bytes[7]] + "-" +
          byteToHex[bytes[8]] + byteToHex[bytes[9]] + "-" +
          byteToHex[bytes[10]] + byteToHex[bytes[11]] + byteToHex[bytes[12]] + byteToHex[bytes[13]] + byteToHex[bytes[14]] + byteToHex[bytes[15]]
        );
      }

      // 3) Last-resort fallback (not RFC but unique enough)
      return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    } catch (err) {
      return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault();

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedUserType = (userType || "").trim();
    const trimmedPassword = password.trim();

    if (!trimmedFullName || !trimmedEmail || !trimmedPhone || !trimmedUserType || !trimmedPassword) {
      alert("Please fill all required fields");
      return;
    }

    if (trimmedUserType !== "parent" && (!sex || !dob)) {
      alert("Please provide your sex and date of birth");
      return;
    }

    if (trimmedUserType === "parent" && (!childName.trim() || !childSex || !childDob)) {
      alert("Please provide your child's name, sex, and date of birth");
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
      if (trimmedUserType === "parent") {
        // 1) Create parent auth account
        const { data: parentAuth, error: parentAuthError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (parentAuthError) throw parentAuthError;
        const parentId = parentAuth?.user?.id;

        // 2) Insert parent into users table
        const { error: parentUserError } = await supabase.from("users").insert([
          {
            id: parentId,
            full_name: trimmedFullName,
            email: trimmedEmail,
            phone: trimmedPhone,
            user_type: "parent",
            city,
          },
        ]);
        if (parentUserError) throw parentUserError;

        // 3) Insert child into users table (student). We create a guaranteed-unique dummy email for the child
        const safeChildName = childName.trim().replace(/\s+/g, "_").toLowerCase();
        const uniqueChildEmail = `${safeChildName}_${generateUUID()}@child.temp`;

        const { data: childInsert, error: childError } = await supabase
          .from("users")
          .insert([
            {
              full_name: childName.trim(),
              sex: childSex,
              dob: childDob,
              user_type: "student",
              city,
              parent_email: trimmedEmail, // reference to parent
              phone: trimmedPhone,
              level: "Nursery",
              email: uniqueChildEmail, // always unique; child does NOT have an auth account
            },
          ])
          .select()
          .single();

        if (childError) throw childError;
        const childId = childInsert.id;

        // 4) Link parent → child in parents table
        const { error: parentLinkError } = await supabase.from("parents").insert([
          {
            user_id: parentId,
            full_name: trimmedFullName,
            child_id: childId,
          },
        ]);
        if (parentLinkError) throw parentLinkError;

        // Redirect parents to student page (as discussed)
        alert("Registration successful. Redirecting...");
        router.push("/student");
      } else {
        // Regular student / teacher (create auth + users row)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (authError) throw authError;

        const userId = authData?.user?.id;

        const { error: insertError } = await supabase.from("users").insert([
          {
            id: userId,
            full_name: trimmedFullName,
            email: trimmedEmail,
            phone: trimmedPhone,
            sex,
            dob,
            city,
            user_type: trimmedUserType,
          },
        ]);
        if (insertError) throw insertError;

        alert("Registration successful. Redirecting...");
        if (trimmedUserType === "teacher") router.push("/teacher");
        else router.push("/student");
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

        {userType !== "parent" && (
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
        )}

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

        {userType === "parent" && (
          <div className="p-4 border rounded bg-gray-50 space-y-3">
            <h3 className="font-semibold">Child Information</h3>
            <input
              placeholder="Child's Name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <select
              value={childSex}
              onChange={(e) => setChildSex(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <input
              type="date"
              value={childDob}
              onChange={(e) => setChildDob(e.target.value)}
              className="w-full p-2 border rounded"
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
