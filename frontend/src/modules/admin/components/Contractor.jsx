import { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2,
  Edit,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "../../../shared/hooks/useDebounce";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

const LOAD_CONTRACTORS_QUERY = `
  query GetContractorsPage($pageNumber: Int!, $pageSize: Int!, $search: String) {
    contractorsPage(
      pageNumber: $pageNumber
      pageSize: $pageSize
      search: $search
    ) {
      items {
        id
        companyName
        contactPerson
        email
        phone
        assignedSites
        enable
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
    allContractors: contractors {
      enable
    }
  }
`;

const LOAD_SITES_QUERY = `
  query GetSites {
    sites {
      id
      siteName
    }
  }
`;

const CREATE_CONTRACTOR_MUTATION = `
  mutation CreateContractor($input: CreateContractorInput!) {
    createContractor(input: $input) {
      id
    }
  }
`;

const UPDATE_CONTRACTOR_MUTATION = `
  mutation UpdateContractor($input: UpdateContractorInput!) {
    updateContractor(input: $input) {
      id
    }
  }
`;

const DELETE_CONTRACTOR_MUTATION = `
  mutation DeleteContractor($id: Int!) {
    deleteContractor(id: $id)
  }
`;

function Contractor() {
  const [contractors, setContractors] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [overallActiveCount, setOverallActiveCount] = useState(0);
  const [overallInactiveCount, setOverallInactiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const siteDropdownRef = useRef(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    assignedSites: [],
    enable: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const loadData = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setIsLoading(true);
    }
    setLoadError(null);

    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoadError("Missing authentication token. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      const trimmedSearch = debouncedSearch.trim();
      
      // Load both contractors page and all sites
      const [contractorsRes, sitesRes] = await Promise.all([
        apiClient.post(
          "/graphql",
          {
            query: LOAD_CONTRACTORS_QUERY,
            variables: {
              pageNumber,
              pageSize,
              search: trimmedSearch || null,
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        apiClient.post(
          "/graphql",
          { query: LOAD_SITES_QUERY },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      if (contractorsRes.data.errors) {
        setLoadError(contractorsRes.data.errors[0].message);
        toast.error(contractorsRes.data.errors[0].message);
        return;
      }

      if (sitesRes.data.errors) {
        toast.error("Failed to load sites for assignment: " + sitesRes.data.errors[0].message);
      } else {
        setSitesList(sitesRes.data.data.sites.map(s => s.siteName));
      }

      const page = contractorsRes.data.data.contractorsPage;
      setContractors(page.items);
      setTotalCount(page.totalCount);

      const all = contractorsRes.data.data.allContractors;
      const searchLower = debouncedSearch.toLowerCase().trim();
      const filteredAll = searchLower 
        ? all.filter(c => 
            (c.companyName?.toLowerCase().includes(searchLower)) ||
            (c.contactPerson?.toLowerCase().includes(searchLower)) ||
            (c.email?.toLowerCase().includes(searchLower))
          )
        : all;
      
      setOverallActiveCount(filteredAll.filter(c => c.enable).length);
      setOverallInactiveCount(filteredAll.filter(c => !c.enable).length);
    } catch (err) {
      setLoadError(err.message || "Failed to load contractors.");
      toast.error(err.message || "Failed to load contractors.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pageNumber, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!isSiteDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target)) {
        setIsSiteDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSiteDropdownOpen]);

  const handleAddNew = () => {
    setEditingContractor(null);
    setFormData({
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      assignedSites: [],
      enable: true,
    });
    setFormErrors({});
    setIsSiteDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleEdit = (contractor) => {
    setEditingContractor(contractor);
    const assignedSitesArray = contractor.assignedSites 
      ? contractor.assignedSites.split(',').map(s => s.trim()).filter(Boolean)
      : [];
      
    setFormData({
      companyName: contractor.companyName,
      contactPerson: contractor.contactPerson,
      email: contractor.email,
      phone: contractor.phone,
      assignedSites: assignedSitesArray,
      enable: contractor.enable,
    });
    setFormErrors({});
    setIsSiteDropdownOpen(false);
    setIsModalOpen(true);
  };

  const toggleStatus = async (contractor) => {
    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: UPDATE_CONTRACTOR_MUTATION,
          variables: {
            input: {
              id: contractor.id,
              companyName: contractor.companyName,
              contactPerson: contractor.contactPerson,
              email: contractor.email,
              phone: contractor.phone,
              assignedSites: contractor.assignedSites,
              enable: !contractor.enable,
              modifiedBy: "system"
            }
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success(`Contractor marked as ${!contractor.enable ? 'Active' : 'Inactive'}`);
      loadData(false);
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: DELETE_CONTRACTOR_MUTATION,
          variables: { id: itemToDelete.id },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Contractor deleted successfully.");
      loadData(false);
    } catch (err) {
      toast.error("Failed to delete contractor.");
    } finally {
      setItemToDelete(null);
    }
  };

  const toggleAssignedSite = (site) => {
    setFormData((current) => ({
      ...current,
      assignedSites: current.assignedSites.includes(site)
        ? current.assignedSites.filter((item) => item !== site)
        : [...current.assignedSites, site],
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.companyName.trim()) errors.companyName = "Company name is required";
    if (!formData.contactPerson.trim()) errors.contactPerson = "Contact person is required";
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
      errors.phone = "Phone must be 10 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem("authToken");
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const sitesString = formData.assignedSites.join(", ");

    try {
      if (editingContractor) {
        const response = await apiClient.post(
          "/graphql",
          {
            query: UPDATE_CONTRACTOR_MUTATION,
            variables: {
              input: {
                id: editingContractor.id,
                companyName: formData.companyName,
                contactPerson: formData.contactPerson,
                email: formData.email,
                phone: cleanPhone,
                assignedSites: sitesString,
                enable: formData.enable,
                modifiedBy: "system", 
              },
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.errors) {
          toast.error(response.data.errors[0].message);
          return;
        }

        toast.success("Contractor updated successfully.");
      } else {
        const response = await apiClient.post(
          "/graphql",
          {
            query: CREATE_CONTRACTOR_MUTATION,
            variables: {
              input: {
                companyName: formData.companyName,
                contactPerson: formData.contactPerson,
                email: formData.email,
                phone: cleanPhone,
                assignedSites: sitesString,
                enable: formData.enable,
                createdBy: "system",
              },
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.errors) {
          toast.error(response.data.errors[0].message);
          return;
        }

        toast.success("Contractor created successfully.");
      }
      
      setIsModalOpen(false);
      loadData(false);
    } catch (err) {
      toast.error("Failed to save contractor.");
    }
  };

  const activeCount = contractors.filter((c) => c.enable).length;
  const inactiveCount = contractors.filter((c) => !c.enable).length;

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-gray-300 focus:ring-[#FDB71A]"
    }`;

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
              <p className="text-sm text-gray-500">Total Active</p>
              <h3 className="text-gray-900">{overallActiveCount}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
              <UserX className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Inactive</p>
              <h3 className="text-gray-900">{overallInactiveCount}</h3>
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
              <p className="text-sm text-gray-500">Total Results</p>
              <h3 className="text-gray-900">{totalCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by company, contact, or email..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A] sm:max-w-sm"
        />
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
          {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full min-w-[900px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Company</th>
                <th className="px-6 py-4 text-left text-gray-700">Contact Person</th>
                <th className="px-6 py-4 text-left text-gray-700">Email</th>
                <th className="px-6 py-4 text-left text-gray-700">Phone</th>
                <th className="px-6 py-4 text-left text-gray-700">Assigned Sites</th>
                <th className="px-6 py-4 text-left text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && contractors.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No contractors found.
                  </td>
                </tr>
              )}
              {!isLoading && contractors.map((contractor) => (
                <tr
                  key={contractor.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <p className="text-gray-900 capitalize">{contractor.companyName}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{contractor.contactPerson}</td>
                  <td className="px-6 py-4 text-gray-900">{contractor.email}</td>
                  <td className="px-6 py-4 text-gray-900">{contractor.phone}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {contractor.assignedSites || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => toggleStatus(contractor)}
                      className={`relative inline-flex h-7 w-[84px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        contractor.enable ? "bg-[#34A853]" : "bg-[#EA4335]"
                      }`}
                    >
                      <span className={`absolute text-[10px] font-bold text-white ${contractor.enable ? 'left-2' : 'right-2'}`}>
                        {contractor.enable ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          contractor.enable ? "translate-x-[60px]" : "translate-x-1"
                        }`}
                      />
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="block md:hidden">
            {isLoading && (
              <div className="p-6 text-center text-gray-500">
                Loading...
              </div>
            )}
            {!isLoading && contractors.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No contractors found.
              </div>
            )}
            {!isLoading && contractors.map((contractor) => (
              <div
                key={contractor.id}
                className="border-b border-gray-200 p-4 last:border-0 hover:bg-gray-50"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{contractor.companyName}</p>
                    <p className="text-xs text-gray-500">{contractor.contactPerson}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(contractor)}
                    className={`relative inline-flex h-7 w-[84px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      contractor.enable ? "bg-[#34A853]" : "bg-[#EA4335]"
                    }`}
                  >
                    <span className={`absolute text-[10px] font-bold text-white ${contractor.enable ? 'left-2' : 'right-2'}`}>
                      {contractor.enable ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        contractor.enable ? "translate-x-[60px]" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                
                <div className="mb-4 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span className="truncate ml-4">{contractor.email || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span>{contractor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sites:</span>
                    <span className="text-right ml-4">{contractor.assignedSites || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(contractor)}
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  >
                    <Edit className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 px-6 py-4">
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={(nextPage) => setPageNumber(nextPage)}
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-6 text-gray-900">
              {editingContractor ? "Edit Contractor" : "Add New Contractor"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700">
                  Company Name <span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(event) => {
                    setFormData({ ...formData, companyName: event.target.value });
                    if (formErrors.companyName) setFormErrors({ ...formErrors, companyName: null });
                  }}
                  className={getFieldClassName(formErrors.companyName)}
                  placeholder="Enter company name"
                />
                {renderFieldError(formErrors.companyName)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Contact Person <span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(event) => {
                    setFormData({ ...formData, contactPerson: event.target.value });
                    if (formErrors.contactPerson) setFormErrors({ ...formErrors, contactPerson: null });
                  }}
                  className={getFieldClassName(formErrors.contactPerson)}
                  placeholder="Enter contact person"
                />
                {renderFieldError(formErrors.contactPerson)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => {
                    setFormData({ ...formData, email: event.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: null });
                  }}
                  className={getFieldClassName(formErrors.email)}
                  placeholder="Enter email"
                />
                {renderFieldError(formErrors.email)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Phone <span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => {
                    setFormData({ ...formData, phone: event.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: null });
                  }}
                  className={getFieldClassName(formErrors.phone)}
                  placeholder="Enter 10-digit phone number"
                />
                {renderFieldError(formErrors.phone)}
              </div>

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
                      {isSiteDropdownOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {isSiteDropdownOpen && (
                    <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                      <div className="max-h-48 space-y-2 overflow-auto">
                        {sitesList.map((site) => (
                          <label
                            key={site}
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={formData.assignedSites.includes(site)}
                              onChange={() => toggleAssignedSite(site)}
                              className="h-4 w-4 rounded border-gray-300 text-[#FDB71A] focus:ring-[#FDB71A]"
                            />
                            <span className="text-sm text-gray-700">{site}</span>
                          </label>
                        ))}
                        {sitesList.length === 0 && (
                          <div className="p-2 text-sm text-gray-500">No sites available</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activeContractorStatus"
                  checked={formData.enable}
                  onChange={(event) =>
                    setFormData({ ...formData, enable: event.target.checked })
                  }
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="activeContractorStatus" className="text-gray-700">
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

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Contractor"
        message={`Are you sure you want to delete the contractor "${itemToDelete?.companyName}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default Contractor;
