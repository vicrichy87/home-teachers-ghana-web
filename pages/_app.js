// pages/_app.js
import "../styles/globals.css";
import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setChecking(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in → only allow login/register
        if (!["/login", "/register"].includes(router.pathname)) {
          router.push("/login");
        }
        setChecking(false);
        return;
      }

      // ✅ Logged in, check profile
      const { data: profile } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        // No profile → force complete registration
        if (router.pathname !== "/complete-registration") {
          router.push("/complete-registration");
        }
        setChecking(false);
        return;
      }

      // ✅ User has profile
      if (["/login", "/register", "/complete-registration"].includes(router.pathname)) {
        if (profile.user_type === "teacher") router.push("/teacher");
        else router.push("/student");
      }

      setChecking(false);
    };

    checkAuth();

    // Re-run when auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router.pathname]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 text-lg">Checking session...</p>
      </div>
    );
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
