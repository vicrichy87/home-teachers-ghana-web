import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Banner from "../components/Banner";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ✅ Clear any leftover OAuth state on mount to prevent bad_oauth_state
  useEffect(() => {
    const clearOAuthState = async () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("error") === "invalid_request") {
        url.searchParams.delete("error");
        url.searchParams.delete("error_code");
        url.searchParams.delete("error_description");
        window.history.replaceState({}, document.title, url.pathname);
      }
    };
    clearOAuthState();
  }, []);

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

        if (profile.user_type === "teacher") router.push("/teacher");
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

      if (!profile) router.push("/complete-registration");
      else if (profile.user_type === "teacher") router.push("/teacher");
      else router.push("/student");
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // ✅ Dedicated callback page to avoid OAuth state issues
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      alert(err.message || String(err));
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
        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded flex items-center justify-center gap-2"
      >
        <img
          src="/google-icon.png"
          alt="Google"
          className="w-5 h-5 bg-white rounded"
        />
        Continue with Google
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
