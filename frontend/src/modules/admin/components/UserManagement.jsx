import { useEffect, useState } from "react";
import { Edit, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";

const initialUsers = [];

const roles = ["supervisor", "admin"];
const roleMap = {
  1: "admin",
  2: "supervisor",
};

function UserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "supervisor",
    password: "",
    status: "active",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setIsLoading(true);
      setLoadError(null);

      const token = localStorage.getItem("authToken");
      if (!token) {
        if (isMounted) {
          setLoadError("Missing authentication token. Please log in again.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.post(
          "/graphql",
          {
            query:
              "query GetUsers { users { id mobileNumber name roleId address email createdOn createdBy modifiedOn modifiedBy } }",
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response?.data?.errors?.length) {
          const apiMessage =
            response.data.errors[0]?.message || "Unable to load users.";
          if (isMounted) {
            setLoadError(apiMessage);
          }
          return;
        }

        const apiUsers = response?.data?.data?.users || [];
        const normalizedUsers = apiUsers.map((user) => ({
          id: String(user.id),
          name: user.name || "Unknown",
          email: user.email || "",
          phone: user.mobileNumber || "",
          role: roleMap[Number(user.roleId)] || "supervisor",
          status: "active",
          address: user.address || "",
          createdOn: user.createdOn,
          createdBy: user.createdBy,
          modifiedOn: user.modifiedOn,
          modifiedBy: user.modifiedBy,
        }));

        if (isMounted) {
          setUsers(normalizedUsers);
        }
      } catch (error) {
        const apiMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load users.";
        if (isMounted) {
          setLoadError(apiMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "supervisor",
      password: "",
      status: "active",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: "",
      status: user.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingUser) {
      setUsers(
        users.map((user) =>
          user.id === editingUser.id ? { ...user, ...formData } : user,
        ),
      );
    } else {
      const newUser = {
        id: String(users.length + 1),
        ...formData,
      };
      setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (userId) => {
    setUsers(
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: user.status === "active" ? "inactive" : "active",
            }
          : user,
      ),
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            User Management
          </h1>
          <p className="text-gray-600">Manage supervisors</p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#FDB71A" }}
        >
          <Plus className="h-5 w-5" />
          Add User
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Supervisor</p>
              <h3 className="text-gray-900">
                {users.filter((user) => user.role === "supervisor").length}
              </h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
              <UserX className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Admin</p>
              <h3 className="text-gray-900">
                {users.filter((user) => user.role === "admin").length}
              </h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#FDB71A20" }}
            >
              <UserCheck className="h-6 w-6" style={{ color: "#FDB71A" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <h3 className="text-gray-900">{users.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-gray-700">Phone</th>
                <th className="px-6 py-4 text-left text-gray-700">Role</th>
                <th className="px-6 py-4 text-left text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    Loading users...
                  </td>
                </tr>
              )}
              {!isLoading && loadError && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-red-600"
                  >
                    {loadError}
                  </td>
                </tr>
              )}
              {!isLoading && !loadError && users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    No users found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !loadError &&
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: "#FDB71A" }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <p className="text-gray-900">{user.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{user.phone}</td>
                    <td className="px-6 py-4 text-gray-900 capitalize">
                      {user.role}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(user.id)}
                        className={`rounded-full px-3 py-1 text-sm text-white ${
                          user.status === "active"
                            ? "bg-green-600"
                            : "bg-gray-400"
                        }`}
                      >
                        {user.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(user)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                        >
                          <Edit className="h-5 w-5 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-5 w-5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-6 text-gray-900">
              {editingUser ? "Edit User" : "Add New User"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData({ ...formData, phone: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="mb-2 block text-gray-700">Role</label>
                <select
                  value={formData.role}
                  onChange={(event) =>
                    setFormData({ ...formData, role: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-gray-700">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData({ ...formData, password: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current"
                      : "Enter password"
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activeStatus"
                  checked={formData.status === "active"}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      status: event.target.checked ? "active" : "inactive",
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="activeStatus" className="text-gray-700">
                  Active User
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#FDB71A" }}
              >
                {editingUser ? "Update" : "Create"} User
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
