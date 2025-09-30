// pages/admin.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminPage() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [rates, setRates] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline editing & creating
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({});
  const [creating, setCreating] = useState(false);
  const [createValues, setCreateValues] = useState({});

  // Search, filter, sort
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

  // 🔹 Fetch data
  useEffect(() => {
    fetchData();
  }, []);

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

  // --- CRUD Functions ---
  const handleEdit = (row) => {
    setEditing({ id: row.id, table: tab });
    setEditValues(row);
  };

  const handleChange = (field, value) => {
    if (editing.id) {
      setEditValues((prev) => ({ ...prev, [field]: value }));
    } else {
      setCreateValues((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    const { id, table } = editing;

    let tableName =
      table === "users"
        ? "users"
        : table === "rates"
        ? "teacher_rates"
        : "teacher_students";

    await supabase.from(tableName).update(editValues).eq("id", id);

    setEditing({});
    fetchData();
  };

  const handleDelete = async (row) => {
    let tableName =
      tab === "users"
        ? "users"
        : tab === "rates"
        ? "teacher_rates"
        : "teacher_students";

    await supabase.from(tableName).delete().eq("id", row.id);
    fetchData();
  };

  const handleCreate = async () => {
    let tableName =
      tab === "users"
        ? "users"
        : tab === "rates"
        ? "teacher_rates"
        : "teacher_students";

    await supabase.from(tableName).insert([createValues]);

    setCreating(false);
    setCreateValues({});
    fetchData();
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
        return { field, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { field, direction: "asc" };
    });
  };

  // --- Table Renderer ---
  const renderTable = (data, table) => {
    if (!data.length) return <p>No records found.</p>;
    const visibleFields = Object.keys(data[0]).filter(
      (field) => !excludedFields.includes(field)
    );

    const filteredData = applySearchFilterSort(data, table);

    return (
      <>
        {/* Add New Button */}
        <button
          onClick={() => {
            setCreating(true);
            setCreateValues({});
          }}
          className="mb-4 px-3 py-1 bg-green-600 text-white rounded"
        >
          + Add New
        </button>

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
        </div>

        {/* Data Table */}
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
            {/* Creating New Record Row */}
            {creating && (
              <tr>
                {visibleFields.map((field) => (
                  <td key={field} className="border px-3 py-2">
                    <input
                      type="text"
                      value={createValues[field] ?? ""}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </td>
                ))}
                <td className="border px-3 py-2 space-x-2">
                  <button
                    onClick={handleCreate}
                    className="px-2 py-1 bg-green-500 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setCreateValues({});
                    }}
                    className="px-2 py-1 bg-gray-400 text-white rounded"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {filteredData.map((row) => (
              <tr key={row.id}>
                {visibleFields.map((field) => (
                  <td key={field} className="border px-3 py-2">
                    {editing.id === row.id ? (
                      <input
                        type="text"
                        value={editValues[field] ?? ""}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      />
                    ) : (
                      row[field]
                    )}
                  </td>
                ))}
                <td className="border px-3 py-2 space-x-2">
                  {editing.id === row.id ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="px-2 py-1 bg-green-500 text-white rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing({})}
                        className="px-2 py-1 bg-gray-400 text-white rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(row)}
                        className="px-2 py-1 bg-blue-500 text-white rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 bg-red-500 text-white rounded"
                      >
                        Delete
                      </button>
                    </>
                  )}
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
              setCreating(false);
              setEditing({});
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
