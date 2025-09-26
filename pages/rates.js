// pages/rates.js
import Banner from "../components/Banner";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RatesPage() {
  const [rates, setRates] = useState([]);

  useEffect(()=> {
    (async()=> {
      const { data } = await supabase.from("teacher_rates").select("id, subject, level, rate, teacher:teacher_id ( full_name )").order("id", {ascending:false});
      setRates(data || []);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <Banner />
      <h2 className="mt-4 font-semibold">All Rates</h2>
      <div className="mt-4 space-y-3">
        {rates.map(r => (
          <div key={r.id} className="p-3 border rounded">
            <div className="font-semibold">{r.subject}</div>
            <div>{r.level} — GHC {r.rate}</div>
            <div>Teacher: {r.teacher?.full_name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
