// components/Navbar.js
import Link from "next/link";
import Banner from "./Banner";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ✅ Detect if current route is student or teacher page
  const isStudentOrTeacherPage =
    router.pathname.startsWith("/student") || router.pathname.startsWith("/teacher");

  return (
    <div className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <a className="flex items-center space-x-3">
            <Banner small />
          </a>
        </Link>

        <nav className="flex items-center space-x-3">
          <Link href="/"><a className="text-slate-700 hover:text-sky-600">Home</a></Link>
          <Link href="/search"><a className="text-slate-700 hover:text-sky-600">Search</a></Link>

          {isStudentOrTeacherPage ? (
            // ✅ Teacher/Student pages → only Logout
            <button
              onClick={handleLogout}
              className="ml-3 bg-red-500 text-white px-3 py-1 rounded"
            >
              Logout
            </button>
          ) : (
            // ✅ Index page (and others) → Login + Register if not logged in
            <>
              {!session && (
                <>
                  <Link href="/login">
                    <a className="text-sky-600 font-semibold">Login</a>
                  </Link>
                  <Link href="/register">
                    <a className="ml-2 border px-3 py-1 rounded bg-sky-50 text-sky-700">
                      Register
                    </a>
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
