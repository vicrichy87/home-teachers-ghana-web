// pages/admin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function AdminPage() {
  const router = useRouter();
  const [userType, setUserType] = useState(null);
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [rates, setRates] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [creating, setCreating] = useState({});

  // Search, filter, sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });

  const excludedFields = [
    "password",
    "encrypted_password",
    "created_at",
    "updated_at",
    "last_sign_in_at",
    "email_confirmed_at",
    "phone_confirmed_at",
    "raw_app_meta_data",
    "raw_user_meta_data",
    "hashed_token",
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.user_type !== "admin") {
        router.push("/");
        return;
      }
      setUserType("admin");
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (userType === "admin") {
      fetchData();
    }
  }, [userType]);

  const fetchData = async () => {
    setLoading(true);
    const { data: allUsers } = await supabase.from("users").select("*");
    const { data: allRates } = await supabase.from("teacher_rates").select("*");
    const { data: allSubjects } = await supabase.from("teacher_students").select("*");
    setUsers(allUsers || []);
    setRates(allRates || []);
    setSubjects(allSubjects || []);
    setLoading(false);
  };

  // --- CRUD functions remain unchanged (delete, edit, create) ---

  // --- Search, filter, sort helpers ---
  const applySearchFilterSort = (data, table) => {
    let filtered = data.filter((row) => {
      const matchesSearch = Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (table === "users" && filterValue) {
        matchesFilter = row.user_type === filterValue;
      } else if (table === "teacher_students" && filterValue) {
        matchesFilter = row.level === filterValue;
      } else if (table === "teacher_rates" && filterValue) {
        matchesFilter = String(row.teacher_id) === filterValue;
      }

      return matchesSearch && matchesFilter;
    });

    if (sortConfig.field) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.field] ?? "";
        const bVal = b[sortConfig.field] ?? "";

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { field, direction: "asc" };
    });
  };

  const renderTable = (data, table) => {
    if (!data.length) return <p>No records found.</p>;
    const visibleFields = Object.keys(data[0]).filter(
      (field) => !excludedFields.includes(field)
    );

    const filteredData = applySearchFilterSort(data, table);

    return (
      <>
        {/* Search + filter controls */}
        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="border px-2 py-1 rounded w-1/2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {table === "users" && (
            <select
              className="border px-2 py-1 rounded"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            >
              <option value="">All user types</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          )}

          {table === "teacher_students" && (
            <select
              className="border px-2 py-1 rounded"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            >
              <option value="">All levels</option>
              <option value="Primary">Primary</option>
              <option value="JHS">JHS</option>
              <option value="SHS">SHS</option>
              <option value="University">University</option>
            </select>
          )}

          {table === "teacher_rates" && (
            <select
              className="border px-2 py-1 rounded"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            >
              <option value="">All teachers</option>
              {[...new Set(rates.map((r) => r.teacher_id))].map((id) => (
                <option key={id} value={id}>
                  Teacher {id}
                </option>
              ))}
            </select>
          )}
        </div>

        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              {visibleFields.map((f) => (
                <th
                  key={f}
                  onClick={() => handleSort(f)}
                  className="border px-3 py-2 cursor-pointer select-none"
                >
                  {f}
                  {sortConfig.field === f &&
                    (sortConfig.direction === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
              <th className="border px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.id}>
                {visibleFields.map((field) => (
                  <td key={field} className="border px-3 py-2">
                    {row[field]}
                  </td>
                ))}
                <td className="border px-3 py-2">
                  {/* Edit/Delete buttons (reuse your existing edit logic here) */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sky-50">
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        {["users", "rates", "subjects"].map((t) => (
          <button
            key={t}
            className={`px-3 py-1 rounded ${
              tab === t ? "bg-sky-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => {
              setTab(t);
              setSearchQuery("");
              setFilterValue("");
              setSortConfig({ field: null, direction: "asc" });
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "users" && renderTable(users, "users")}
      {tab === "rates" && renderTable(rates, "teacher_rates")}
      {tab === "subjects" && renderTable(subjects, "teacher_students")}
    </div>
  );
}
