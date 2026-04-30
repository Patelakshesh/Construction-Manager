import { useState, useEffect, useRef } from "react";
import {
  Edit,
  MapPin,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  ChevronDown,
} from "lucide-react";

const initialSites = [
  {
    id: "1",
    name: "Downtown Plaza",
    location: "Downtown District",
    budget: 500000,
    expenses: 420000,
    supervisor: ["John Doe", "Jane Smith"],
    status: "active",
  },
  {
    id: "2",
    name: "Riverside Complex",
    location: "Riverside Area",
    budget: 750000,
    expenses: 680000,
    supervisor: ["Jane Smith"],
    status: "active",
  },
  {
    id: "3",
    name: "Industrial Park",
    location: "Industrial Zone",
    budget: 300000,
    expenses: 310000,
    supervisor: ["Mike Johnson"],
    status: "inactive",
  },
  {
    id: "4",
    name: "Suburban Mall",
    location: "Suburban District",
    budget: 600000,
    expenses: 550000,
    supervisor: ["Sarah Williams"],
    status: "active",
  },
];

const supervisors = [
  "John Doe",
  "Jane Smith",
  "Mike Johnson",
  "Sarah Williams",
  "Tom Anderson",
];

function SiteManagement() {
  const [sites, setSites] = useState(initialSites);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    budget: "",
    expenses: "",
    supervisor: [],
    status: "active",
  });

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] =
    useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSupervisorDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddNew = () => {
    setEditingSite(null);
    setFormData({
      name: "",
      location: "",
      budget: "",
      expenses: "",
      supervisor: [],
      status: "active",
    });
    setIsSupervisorDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      location: site.location,
      budget: String(site.budget),
      expenses: String(site.expenses),
      supervisor: site.supervisor || [],
      status: site.status,
    });
    setIsSupervisorDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleDelete = (siteId) => {
    setSites(sites.filter((site) => site.id !== siteId));
  };

  const handleSave = () => {
    const payload = {
      ...formData,
      budget: Number(formData.budget) || 0,
      expenses: Number(formData.expenses) || 0,
    };

    if (editingSite) {
      setSites(
        sites.map((site) =>
          site.id === editingSite.id ? { ...site, ...payload } : site,
        ),
      );
    } else {
      const newSite = {
        id: String(sites.length + 1),
        ...payload,
      };
      setSites([...sites, newSite]);
    }

    setIsModalOpen(false);
  };

  const toggleStatus = (siteId) => {
    setSites(
      sites.map((site) =>
        site.id === siteId
          ? {
              ...site,
              status: site.status === "active" ? "inactive" : "active",
            }
          : site,
      ),
    );
  };

  const filteredSites = sites.filter((site) => {
    const matchesStatus =
      filterStatus === "all" || site.status === filterStatus;

    // search across array items
    const supervisorMatch = Array.isArray(site.supervisor)
      ? site.supervisor.some((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : String(site.supervisor)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

    const matchesSearch =
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supervisorMatch;

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Site Management
          </h1>
          <p className="text-gray-600">
            Manage construction sites, budgets, and supervisors
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#FDB71A" }}
        >
          <Plus className="h-5 w-5" />
          Add Site
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by site, location or supervisor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A] sm:w-48"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Sites</p>
              <h3 className="text-gray-900">
                {sites.filter((site) => site.status === "active").length}
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
              <p className="text-sm text-gray-500">Inactive Sites</p>
              <h3 className="text-gray-900">
                {sites.filter((site) => site.status === "inactive").length}
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
              <MapPin className="h-6 w-6" style={{ color: "#FDB71A" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sites</p>
              <h3 className="text-gray-900">{sites.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Site</th>
                <th className="px-6 py-4 text-left text-gray-700">Location</th>
                {/* <th className="px-6 py-4 text-left text-gray-700">Budget</th> */}
                {/* <th className="px-6 py-4 text-left text-gray-700">Expenses</th> */}
                <th className="px-6 py-4 text-left text-gray-700">
                  Supervisor
                </th>
                <th className="px-6 py-4 text-left text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSites.map((site) => (
                <tr
                  key={site.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: "#FDB71A" }}
                      >
                        {site.name.charAt(0)}
                      </div>
                      <p className="text-gray-900">{site.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{site.location}</td>
                  {/* <td className="px-6 py-4 text-gray-900">
                    ₹{site.budget.toLocaleString()}
                  </td> */}
                  {/* <td className="px-6 py-4 text-gray-900">
                    ₹{site.expenses.toLocaleString()}
                  </td> */}
                  <td className="px-6 py-4 text-gray-900">
                    {Array.isArray(site.supervisor)
                      ? site.supervisor.join(", ")
                      : site.supervisor}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => toggleStatus(site.id)}
                      className={`rounded-full px-3 py-1 text-sm text-white ${
                        site.status === "active"
                          ? "bg-green-600"
                          : "bg-gray-400"
                      }`}
                    >
                      {site.status}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(site)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                      >
                        <Edit className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(site.id)}
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
              {editingSite ? "Edit Site" : "Add New Site"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700">Site Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter site name"
                />
              </div>

              <div>
                <label className="mb-2 block text-gray-700">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(event) =>
                    setFormData({ ...formData, location: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter location"
                />
              </div>

              {/* <div>
                <label className="mb-2 block text-gray-700">Budget</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(event) =>
                    setFormData({ ...formData, budget: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter budget"
                />
              </div> */}

              {/* <div>
                <label className="mb-2 block text-gray-700">Expenses</label>
                <input
                  type="number"
                  value={formData.expenses}
                  onChange={(event) =>
                    setFormData({ ...formData, expenses: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter expenses"
                />
              </div> */}

              <div className="relative" ref={dropdownRef}>
                <label className="mb-2 block text-gray-700">
                  Assign Supervisor
                </label>
                <div
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  onClick={() =>
                    setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)
                  }
                >
                  <span className="truncate text-gray-700">
                    {formData.supervisor.length > 0
                      ? formData.supervisor.join(", ")
                      : "Select supervisors"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>

                {isSupervisorDropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {supervisors.map((supervisor) => (
                      <label
                        key={supervisor}
                        className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={formData.supervisor.includes(supervisor)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              setFormData({
                                ...formData,
                                supervisor: [
                                  ...formData.supervisor,
                                  supervisor,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                supervisor: formData.supervisor.filter(
                                  (s) => s !== supervisor,
                                ),
                              });
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-[#FDB71A] focus:ring-[#FDB71A]"
                        />
                        <span className="text-gray-700">{supervisor}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activeSiteStatus"
                  checked={formData.status === "active"}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      status: event.target.checked ? "active" : "inactive",
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="activeSiteStatus" className="text-gray-700">
                  Active Site
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
                {editingSite ? "Update" : "Create"} Site
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

export default SiteManagement;
