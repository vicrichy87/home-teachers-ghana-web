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

  // Search, filter, sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });

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
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, full_name, profile_picture, location, email, phone, sex, date_of_birth");

    const { data: allRates } = await supabase.from("teacher_rates").select("*");
    const { data: allSubjects } = await supabase.from("teacher_students").select("*");

    setUsers(allUsers || []);
    setRates(allRates || []);
    setSubjects(allSubjects || []);
    setLoading(false);
  };

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

  // --- Users Table (custom fields only) ---
  const renderUsersTable = (data) => {
    if (!data.length) return <p>No users found.</p>;

    return (
      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2">Name</th>
            <th className="border px-3 py-2">Picture</th>
            <th className="border px-3 py-2">Location</th>
            <th className="border px-3 py-2">Email</th>
            <th className="border px-3 py-2">Phone</th>
            <th className="border px-3 py-2">Sex</th>
            <th className="border px-3 py-2">Date of Birth</th>
            <th className="border px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user) => (
            <tr key={user.id}>
              <td className="border px-3 py-2">{user.full_name}</td>
              <td className="border px-3 py-2">
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span>No Image</span>
                )}
              </td>
              <td className="border px-3 py-2">{user.location}</td>
              <td className="border px-3 py-2">{user.email}</td>
              <td className="border px-3 py-2">{user.phone}</td>
              <td className="border px-3 py-2">{user.sex}</td>
              <td className="border px-3 py-2">{user.date_of_birth}</td>
              <td className="border px-3 py-2">[Edit/Delete]</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // --- Generic table for rates & subjects ---
  const renderTable = (data, table) => {
    if (!data.length) return <p>No records found.</p>;
    const visibleFields = Object.keys(data[0]);

    const filteredData = applySearchFilterSort(data, table);

    return (
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
              <td className="border px-3 py-2">[Edit/Delete]</td>
            </tr>
          ))}
        </tbody>
      </table>
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

      {tab === "users" && renderUsersTable(users)}
      {tab === "rates" && renderTable(rates, "teacher_rates")}
      {tab === "subjects" && renderTable(subjects, "teacher_students")}
    </div>
  );
}
