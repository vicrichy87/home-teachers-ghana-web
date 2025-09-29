// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      // ✅ Ensure Supabase has finished setting the session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        // if no session yet, stay here or retry
        console.log("No session found, retrying...");
        setTimeout(handleRedirect, 500);
        return;
      }

      // ✅ Check if user profile exists in DB
      const { data: profile } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile) {
        router.replace("/complete-registration");
      } else if (profile.user_type === "teacher") {
        router.replace("/teacher");
      } else if (profile.user_type === "student") {
        router.replace("/student");
      } else {
        router.replace("/onboarding"); // fallback
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600 text-lg">Completing login, please wait...</p>
    </div>
  );
}
