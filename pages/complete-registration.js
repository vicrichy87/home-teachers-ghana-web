// pages/complete-registration.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function CompleteRegistration({ initialCity = "" }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [city, setCity] = useState(initialCity || "");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // Prefill user info
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
      setDob(user.user_metadata?.dob || "");
      setSex(user.user_metadata?.sex || "");
      setCity(user.user_metadata?.city || initialCity || "");
    };

    getUser();
  }, [router, initialCity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const isEmailProvider = user?.app_metadata?.provider === "email";
    if (isEmailProvider) {
      if (!password || password !== confirmPassword) {
        alert("Passwords do not match or are empty!");
        return;
      }
    }

    setLoading(true);

    try {
      // Check if user exists in DB
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let dbError = null;

      if (existingUser) {
        const { error } = await supabase
          .from("users")
          .update({
            full_name: name,
            email,
            user_type: userType,
            dob,
            sex,
            city,
          })
          .eq("id", user.id);
        dbError = error;
      } else {
        const { error } = await supabase.from("users").insert({
          id: user.id,
          full_name: name,
          email,
          user_type: userType,
          dob,
          sex,
          city,
        });
        dbError = error;
      }

      if (dbError) throw dbError;

      if (isEmailProvider && password) {
        const { error: pwError } = await supabase.auth.updateUser({
          password,
        });
        if (pwError) throw pwError;
      }

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
          <option value="">Select Role</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>

        {/* ✅ Date of Birth field with visible label */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
          />
        </div>

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

        {/* ✅ City field with hint when auto-detected */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            City {initialCity && "(auto-detected, edit if wrong)"}
          </label>
          <input
            type="text"
            placeholder="Enter your city"
            className="w-full border p-2 rounded"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>

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

// Server-side props: check session and detect city via IP
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

  const req = ctx.req;
  let ip =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "";

  if (typeof ip === "string" && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  const localIps = ["127.0.0.1", "::1", "localhost"];
  let initialCity = "";

  try {
    const useGeneric =
      !ip ||
      localIps.includes(ip) ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("172.");
    const geoUrl = useGeneric
      ? `https://ipapi.co/json/`
      : `https://ipapi.co/${ip}/json/`;

    const res = await fetch(geoUrl, { method: "GET" });
    if (res.ok) {
      const geo = await res.json();
      if (geo && geo.city) initialCity = geo.city;
    }
  } catch (err) {
    console.warn("IP geolocation failed:", err?.message || err);
  }

  return {
    props: {
      initialCity: initialCity || "",
    },
  };
}
