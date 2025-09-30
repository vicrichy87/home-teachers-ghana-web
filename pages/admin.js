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

  // --- DELETE Handlers ---
  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await supabase.from("users").delete().eq("id", id);
    fetchData();
  };

  const handleDeleteRate = async (id) => {
    if (!confirm("Are you sure you want to delete this rate?")) return;
    await supabase.from("teacher_rates").delete().eq("id", id);
    fetchData();
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;
    await supabase.from("teacher_students").delete().eq("id", id);
    fetchData();
  };

  // --- RENDER TABLES ---
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
              <th onClick={() => handleSort("full_name")}>Name</th>
              <th onClick={() => handleSort("user_type")}>User Type</th>
              <th onClick={() => handleSort("email")}>Email</th>
              <th>Phone</th>
              <th>City</th>
              <th>Sex</th>
              <th>DOB</th>
              <th onClick={() => handleSort("created_at")}>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applySearchFilterSort(users, "users").map((user) => (
              <tr key={user.id}>
                <td>{user.profile_image ? <img src={user.profile_image} alt={user.full_name} className="w-10 h-10 rounded-full object-cover"/> : "No Image"}</td>
                <td>{user.full_name}</td>
                <td>{user.user_type}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.city}</td>
                <td>{user.sex}</td>
                <td>{user.dob}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="flex gap-2">
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                  <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleDeleteUser(user.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  const renderRatesTable = () => {
    if (!rates.length) return <p>No rates found.</p>;

    const ratesWithTeacher = rates.map(rate => {
      const teacher = users.find(u => u.id === rate.teacher_id);
      return { ...rate, teacher_name: teacher ? teacher.full_name : "Unknown" };
    });

    return (
      <>
        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            placeholder="Search rates..."
            className="border px-2 py-1 rounded w-1/2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th>Teacher Name</th>
              <th>Subject</th>
              <th>Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applySearchFilterSort(ratesWithTeacher, "teacher_rates").map((rate) => (
              <tr key={rate.id}>
                <td>{rate.teacher_name}</td>
                <td>{rate.subject}</td>
                <td>{rate.rate}</td>
                <td className="flex gap-2">
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                  <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleDeleteRate(rate.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  const renderSubjectsTable = () => {
    if (!subjects.length) return <p>No subjects found.</p>;

    const subjectsWithNames = subjects.map(s => {
      const teacher = users.find(u => u.id === s.teacher_id);
      const student = users.find(u => u.id === s.student_id);
      return {
        ...s,
        teacher_name: teacher ? teacher.full_name : "Unknown",
        student_name: student ? student.full_name : "Unknown",
      };
    });

    return (
      <>
        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            placeholder="Search subjects..."
            className="border px-2 py-1 rounded w-1/2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th>Teacher Name</th>
              <th>Student Name</th>
              <th>Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applySearchFilterSort(subjectsWithNames, "teacher_students").map((s) => (
              <tr key={s.id}>
                <td>{s.teacher_name}</td>
                <td>{s.student_name}</td>
                <td>{s.level}</td>
                <td className="flex gap-2">
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                  <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleDeleteSubject(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-sky-50"><p className="text-gray-600">Loading admin dashboard...</p></div>;

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
      {tab === "rates" && renderRatesTable()}
      {tab === "subjects" && renderSubjectsTable()}
    </div>
  );
}
