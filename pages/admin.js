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

  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: "created_at", direction: "desc" });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: profile } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.user_type !== "admin") return router.push("/403");
      setUserType("admin");
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (userType === "admin") fetchData();
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

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { field, direction: "asc" };
    });
  };

  const applySearchFilterSort = (data, table) => {
    let filtered = data.filter((row) => {
      const matchesSearch = Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (table === "users" && filterValue) matchesFilter = row.user_type === filterValue;
      else if (table === "teacher_students" && filterValue) matchesFilter = row.level === filterValue;
      else if (table === "teacher_rates" && filterValue) matchesFilter = String(row.teacher_id) === filterValue;

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

  const renderUsersTable = () => {
    if (!users.length) return <p>No users found.</p>;

    return (
      <>
        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            placeholder="Search users..."
            className="border px-2 py-1 rounded w-1/2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
        </div>

        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th>Profile</th>
              <th className="cursor-pointer" onClick={() => handleSort("full_name")}>
                Name {sortConfig.field === "full_name" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </th>
              <th className="cursor-pointer" onClick={() => handleSort("user_type")}>
                User Type {sortConfig.field === "user_type" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </th>
              <th className="cursor-pointer" onClick={() => handleSort("email")}>
                Email {sortConfig.field === "email" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </th>
              <th>Phone</th>
              <th>City</th>
              <th>Sex</th>
              <th>DOB</th>
              <th className="cursor-pointer" onClick={() => handleSort("created_at")}>
                Created At {sortConfig.field === "created_at" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </th>
            </tr>
          </thead>
          <tbody>
            {applySearchFilterSort(users, "users").map((user) => (
              <tr key={user.id}>
                <td>
                  {user.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt={user.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span>No Image</span>
                  )}
                </td>
                <td>{user.full_name}</td>
                <td>{user.user_type}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.city}</td>
                <td>{user.sex}</td>
                <td>{user.dob}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
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

      <div className="flex space-x-4 mb-6">
        {["users", "rates", "subjects"].map((t) => (
          <button
            key={t}
            className={`px-3 py-1 rounded ${tab === t ? "bg-sky-600 text-white" : "bg-gray-200"}`}
            onClick={() => {
              setTab(t);
              setSearchQuery("");
              setFilterValue("");
              setSortConfig({ field: "created_at", direction: "desc" });
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "users" && renderUsersTable()}
      {tab === "rates" && <p>Rates table coming soon...</p>}
      {tab === "subjects" && <p>Subjects table coming soon...</p>}
    </div>
  );
}
