// pages/auth/callback.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing login, please wait...");

  useEffect(() => {
    let retries = 0;
    const maxRetries = 10;

    const handleRedirect = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (retries < maxRetries) {
            retries++;
            setTimeout(handleRedirect, 500);
          } else {
            console.error("Failed to get session after multiple attempts");
            setMessage(
              "Failed to complete login. Please refresh the page and try again."
            );
          }
          return;
        }

        const { data: profile, error } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!profile) {
          router.replace("/complete-registration");
        } else if (profile.user_type === "teacher") {
          router.replace("/teacher");
        } else if (profile.user_type === "student") {
          router.replace("/student");
        } else {
          router.replace("/onboarding"); // fallback for unknown user_type
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setMessage(
          "An error occurred while completing login. Please try again."
        );
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}
