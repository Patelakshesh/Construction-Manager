import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Edit,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

const initialContractors = [
  {
    id: "1",
    companyName: "ABC Construction",
    contactPerson: "Raj Malhotra",
    email: "raj@abcconstruction.com",
    phone: "+91 98765 43210",
    assignedSite: "Downtown Plaza",
    status: "active",
  },
  {
    id: "2",
    companyName: "XYZ Builders",
    contactPerson: "Priya Sharma",
    email: "priya@xyzbuilders.com",
    phone: "+91 98765 43211",
    assignedSite: "Riverside Complex",
    status: "active",
  },
  {
    id: "3",
    companyName: "Steel Masters",
    contactPerson: "Amit Verma",
    email: "amit@steelmasters.com",
    phone: "+91 98765 43212",
    assignedSite: "Industrial Park",
    status: "active",
  },
  {
    id: "4",
    companyName: "Prime Interiors",
    contactPerson: "Neha Kapoor",
    email: "neha@primeinteriors.com",
    phone: "+91 98765 43213",
    assignedSite: "Suburban Mall",
    status: "inactive",
  },
];

const sites = [
  "Downtown Plaza",
  "Riverside Complex",
  "Industrial Park",
  "Suburban Mall",
  "Tech Campus",
];

function Contractor() {
  const [contractors, setContractors] = useState(initialContractors);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const siteDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    password: "",
    assignedSites: [],
    status: "active",
  });

  const handleAddNew = () => {
    setEditingContractor(null);
    setFormData({
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      password: "",
      assignedSites: [],
      status: "active",
    });
    setIsSiteDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleEdit = (contractor) => {
    setEditingContractor(contractor);
    setFormData({
      companyName: contractor.companyName,
      contactPerson: contractor.contactPerson,
      email: contractor.email,
      phone: contractor.phone,
      password: "",
      assignedSites: contractor.assignedSites || [contractor.assignedSite],
      status: contractor.status,
    });
    setIsSiteDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingContractor) {
      setContractors(
        contractors.map((contractor) =>
          contractor.id === editingContractor.id
            ? { ...contractor, ...formData }
            : contractor,
        ),
      );
    } else {
      const newContractor = {
        id: String(contractors.length + 1),
        ...formData,
      };
      setContractors([...contractors, newContractor]);
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (contractorId) => {
    setContractors(
      contractors.map((contractor) =>
        contractor.id === contractorId
          ? {
              ...contractor,
              status: contractor.status === "active" ? "inactive" : "active",
            }
          : contractor,
      ),
    );
  };

  const toggleAssignedSite = (site) => {
    setFormData((current) => ({
      ...current,
      assignedSites: current.assignedSites.includes(site)
        ? current.assignedSites.filter((item) => item !== site)
        : [...current.assignedSites, site],
    }));
  };

  useEffect(() => {
    if (!isSiteDropdownOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        siteDropdownRef.current &&
        !siteDropdownRef.current.contains(event.target)
      ) {
        setIsSiteDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSiteDropdownOpen]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Contractor Management
          </h1>
          <p className="text-gray-600">
            Manage contractors and their site assignments
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#FDB71A" }}
        >
          <Plus className="h-5 w-5" />
          Add Contractor
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Contractors</p>
              <h3 className="text-gray-900">
                {
                  contractors.filter(
                    (contractor) => contractor.status === "active",
                  ).length
                }
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
              <p className="text-sm text-gray-500">Inactive Contractors</p>
              <h3 className="text-gray-900">
                {
                  contractors.filter(
                    (contractor) => contractor.status === "inactive",
                  ).length
                }
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
              <Building2 className="h-6 w-6" style={{ color: "#FDB71A" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Contractors</p>
              <h3 className="text-gray-900">{contractors.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Company</th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Contact Person
                </th>
                <th className="px-6 py-4 text-left text-gray-700">Email</th>
                <th className="px-6 py-4 text-left text-gray-700">Phone</th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Assigned Sites
                </th>
                <th className="px-6 py-4 text-left text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractors.map((contractor) => (
                <tr
                  key={contractor.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: "#FDB71A" }}
                      >
                        {contractor.companyName.charAt(0)}
                      </div>
                      <p className="text-gray-900">{contractor.companyName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {contractor.contactPerson}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {contractor.email}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {contractor.phone}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {(contractor.assignedSites || [contractor.assignedSite]).join(
                      ", ",
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => toggleStatus(contractor.id)}
                      className={`rounded-full px-3 py-1 text-sm text-white ${
                        contractor.status === "active"
                          ? "bg-green-600"
                          : "bg-gray-400"
                      }`}
                    >
                      {contractor.status}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(contractor)}
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
              {editingContractor ? "Edit Contractor" : "Add New Contractor"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      companyName: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      contactPerson: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter contact person"
                />
              </div>

              <div>
                <label className="mb-2 block text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData({ ...formData, email: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter email"
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

              {/* <div>
                <label className="mb-2 block text-gray-700">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData({ ...formData, password: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder={
                    editingContractor
                      ? "Leave blank to keep current"
                      : "Enter password"
                  }
                />
              </div> */}

              <div>
                <label className="mb-2 block text-gray-700">Assign Sites</label>
                <div className="relative" ref={siteDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSiteDropdownOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  >
                    <span className="truncate text-gray-700">
                      {formData.assignedSites.length > 0
                        ? formData.assignedSites.join(", ")
                        : "Select sites"}
                    </span>
                    <span className="text-gray-400">
                      {isSiteDropdownOpen ? "^" : "v"}
                    </span>
                  </button>

                  {isSiteDropdownOpen && (
                    <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                      <div className="max-h-48 space-y-2 overflow-auto">
                        {sites.map((site) => (
                          <label
                            key={site}
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={formData.assignedSites.includes(site)}
                              onChange={() => toggleAssignedSite(site)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">
                              {site}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activeContractorStatus"
                  checked={formData.status === "active"}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      status: event.target.checked ? "active" : "inactive",
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label
                  htmlFor="activeContractorStatus"
                  className="text-gray-700"
                >
                  Active Contractor
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
                {editingContractor ? "Update" : "Create"} Contractor
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

export default Contractor;
