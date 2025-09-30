// pages/login.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../components/Banner";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  // ✅ Check session after returning from OAuth redirect
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // check if profile exists
        const { data: profile } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile) {
          router.push("/complete-registration");
          return;
        }

        if (profile.user_type === "admin") router.push("/admin");
        else if (profile.user_type === "teacher") router.push("/teacher");
        else router.push("/student");
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // fetch profile to decide redirect
      const { data: profile } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile) {
        router.push("/complete-registration");
      } else if (profile.user_type === "admin") {
        router.push("/admin");
      } else if (profile.user_type === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // ✅ Ensure redirect to callback page
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google login error:", err);
      alert(err.message || String(err));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <Banner />
      <h2 className="text-xl font-semibold mt-4">Login</h2>

      <form onSubmit={handleLogin} className="mt-4 space-y-3">
        <input
          className="w-full p-2 border rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-600 text-white py-2 rounded"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-4 flex items-center">
        <hr className="flex-grow border-gray-300" />
        <span className="px-2 text-gray-500 text-sm">OR</span>
        <hr className="flex-grow border-gray-300" />
      </div>

      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded flex items-center justify-center gap-2"
      >
        <img
          src="/google-icon.png"
          alt="Google"
          className="w-5 h-5 bg-white rounded"
        />
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      <p className="mt-3 text-sm">
        Don&apos;t have account?{" "}
        <Link href="/register" className="text-sky-600">
          Register
        </Link>
      </p>
    </div>
  );
}
