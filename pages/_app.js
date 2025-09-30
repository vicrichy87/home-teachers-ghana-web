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

      // ✅ Public routes that don’t need login
      const publicRoutes = [
        "/",
        "/about",
        "/contact",
        "/privacy-policy",
        "/terms",
        "/403",
      ];

      if (!user) {
        if (![...publicRoutes, "/login", "/register"].includes(router.pathname)) {
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

      // 🔑 Handle missing profile
      if (!profile) {
        if (user.email === "admin@admin.ts") {
          // Admin bypass
          if (!router.pathname.startsWith("/admin")) {
            router.push("/admin");
          }
        } else {
          if (router.pathname !== "/complete-registration") {
            router.push("/complete-registration");
          }
        }
        setChecking(false);
        return;
      }

      const userType = profile.user_type;

      // ✅ Restrict routes based on role
      if (router.pathname.startsWith("/admin") && userType !== "admin") {
        router.push("/403");
      } else if (
        router.pathname.startsWith("/teacher") &&
        userType !== "teacher"
      ) {
        router.push("/403");
      } else if (
        router.pathname.startsWith("/student") &&
        userType !== "student"
      ) {
        router.push("/403");
      }

      // ✅ Redirect logged-in users away from login/register/complete-registration
      if (
        ["/login", "/register", "/complete-registration"].includes(
          router.pathname
        )
      ) {
        if (userType === "admin" && !router.pathname.startsWith("/admin")) {
          router.push("/admin");
        } else if (
          userType === "teacher" &&
          !router.pathname.startsWith("/teacher")
        ) {
          router.push("/teacher");
        } else if (
          userType === "student" &&
          !router.pathname.startsWith("/student")
        ) {
          router.push("/student");
        }
      }

      setChecking(false);
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router.pathname]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sky-50">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-gray-600 text-lg">Loading! Please wait...</p>
      </div>
    );
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
