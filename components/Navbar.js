// components/Navbar.js
import Link from "next/link";
import Banner from "./Banner";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [country, setCountry] = useState({ name: "", code: "" });

  useEffect(() => {
    // 🔑 Supabase session listener
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    // 🌍 Detect user country via IP with localStorage caching
    const fetchLocation = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem("user_country");
        if (cached) {
          setCountry(JSON.parse(cached));
          return;
        }

        // If not cached, fetch from API
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        let newCountry;
        if (data?.country && data?.country_name) {
          newCountry = { name: data.country_name, code: data.country };
        } else {
          newCountry = { name: "World", code: "🌍" };
        }
        setCountry(newCountry);
        localStorage.setItem("user_country", JSON.stringify(newCountry));
      } catch (err) {
        console.error("Failed to fetch location:", err);
        const fallback = { name: "World", code: "🌍" };
        setCountry(fallback);
        localStorage.setItem("user_country", JSON.stringify(fallback));
      }
    };
    fetchLocation();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Function to get flag emoji from country code
  const getFlagEmoji = (countryCode) => {
    if (!countryCode) return "";
    if (countryCode === "🌍") return "🌍"; // fallback globe emoji
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt())
      );
  };

  return (
    <div className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <a className="flex items-center space-x-3">
            <Banner small />
          </a>
        </Link>

        <nav className="flex items-center space-x-4">
          <Link href="/">
            <a className="text-slate-700 hover:text-sky-600 flex items-center gap-2">
              {country.code && (
                <span title={country.name} className="text-lg">
                  {getFlagEmoji(country.code)}
                </span>
              )}
            <a className="text-sky-600 font-semibold">  Home</a>
            </a>
          </Link>

          {!session ? (
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
          ) : (
            <>
              <button
                onClick={handleLogout}
                className="ml-3 bg-red-500 text-white px-3 py-1 rounded"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

