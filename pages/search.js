// pages/search.js
import Banner from "../components/Banner";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

export default function SearchPage() {
  const [location, setLocation] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [results, setResults] = useState([]);

  async function searchByLocation() {
    const { data, error } = await supabase.from("users").select("id, full_name, email, phone, city").eq("city", location).eq("user_type", "teacher");
    setResults(data || []);
  }

  async function searchBySubjectLevel() {
    const { data } = await supabase.from("teacher_rates").select("id, subject, level, rate, teacher:teacher_id ( id, full_name, email, phone, city )").eq("subject", subject).eq("level", level);
    setResults(data || []);
  }

  async function searchBySubjectOnly() {
    const { data } = await supabase.from("teacher_rates").select("id, subject, level, rate, teacher:teacher_id ( id, full_name, email, phone, city )").eq("subject", subject);
    setResults(data || []);
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <Banner />
      <h2 className="mt-4 font-semibold">Search Teachers</h2>

      <div className="mt-4">
        <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Location" className="p-2 border rounded w-full" />
        <button onClick={searchByLocation} className="mt-2 bg-emerald-600 text-white px-3 py-2 rounded">Search by Location</button>
      </div>

      <div className="mt-4">
        <input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Subject" className="p-2 border rounded w-full" />
        <select value={level} onChange={(e)=>setLevel(e.target.value)} className="p-2 border rounded mt-2">
          <option value="">Select level</option>
          <option value="JHS">JHS</option>
          <option value="SHS">SHS</option>
          <option value="Remedial">Remedial</option>
        </select>
        <div className="flex gap-2 mt-2">
          <button onClick={searchBySubjectLevel} className="bg-emerald-600 text-white px-3 py-2 rounded">Search by Subject & Level</button>
          <button onClick={searchBySubjectOnly} className="bg-sky-600 text-white px-3 py-2 rounded">Search by Subject Only</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {results.length === 0 && <div className="text-slate-600">No results yet.</div>}
        {results.map((r, i) => (
          <div key={i} className="p-3 border rounded">
            <div className="font-semibold">{r.teacher ? r.teacher.full_name : r.full_name}</div>
            <div>{r.teacher ? r.teacher.email : r.email}</div>
            <div>{r.teacher ? r.teacher.city : r.city}</div>
            {r.subject && <div>{r.subject} ({r.level}) — GHC {r.rate}</div>}
            <Link href="/login"><a className="text-sky-600">Login to register</a></Link>
          </div>
        ))}
      </div>
    </div>
  );
}
