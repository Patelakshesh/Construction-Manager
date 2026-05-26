import { useState, useEffect, useCallback } from "react";
import { CreditCard, Edit, Plus, ReceiptIndianRupee, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "../../../shared/hooks/useDebounce";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

const LOAD_CREDITS_QUERY = `
  query GetSupervisorCreditsPage($pageNumber: Int!, $pageSize: Int!, $search: String, $supervisorName: String, $paymentMode: String) {
    supervisorCreditsPage(
      pageNumber: $pageNumber
      pageSize: $pageSize
      search: $search
      supervisorName: $supervisorName
      paymentMode: $paymentMode
    ) {
      items {
        id
        supervisorName
        amount
        paymentMode
        transactionId
        comment
        date
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
    allCredits: supervisorCredits {
      amount
      supervisorName
      paymentMode
      comment
      transactionId
    }
  }
`;

const LOAD_SUPERVISORS_QUERY = `
  query GetUsers {
    users {
      name
      roleId
      enable
    }
  }
`;

const LOAD_ROLES_QUERY = `
  query GetRoles {
    roles {
      id
      roleName
    }
  }
`;

const CREATE_CREDIT_MUTATION = `
  mutation CreateSupervisorCredit($input: CreateSupervisorCreditInput!) {
    createSupervisorCredit(input: $input) {
      id
    }
  }
`;

const UPDATE_CREDIT_MUTATION = `
  mutation UpdateSupervisorCredit($input: UpdateSupervisorCreditInput!) {
    updateSupervisorCredit(input: $input) {
      id
    }
  }
`;

const DELETE_CREDIT_MUTATION = `
  mutation DeleteSupervisorCredit($id: Int!) {
    deleteSupervisorCredit(id: $id)
  }
`;

function SupervisorCredit() {
  const [credits, setCredits] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  
  const [selectedSupervisor, setSelectedSupervisor] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [overallTotalAmount, setOverallTotalAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({
    supervisor: "",
    amount: "",
    paymentMode: "Cash",
    transactionId: "",
    comment: "",
    date: new Date().toISOString().split("T")[0],
  });

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
      
      const [creditsRes, usersRes, rolesRes] = await Promise.all([
        apiClient.post(
          "/graphql",
          {
            query: LOAD_CREDITS_QUERY,
            variables: {
              pageNumber,
              pageSize,
              search: trimmedSearch || null,
              supervisorName: selectedSupervisor === "all" ? null : selectedSupervisor,
              paymentMode: selectedPaymentMode === "all" ? null : selectedPaymentMode,
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        apiClient.post(
          "/graphql",
          { query: LOAD_SUPERVISORS_QUERY },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        apiClient.post(
          "/graphql",
          { query: LOAD_ROLES_QUERY },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      if (creditsRes.data.errors) {
        setLoadError(creditsRes.data.errors[0].message);
        toast.error(creditsRes.data.errors[0].message);
        return;
      }

      let supervisorRoleId = null;
      if (rolesRes.data.errors) {
        toast.error("Failed to load roles: " + rolesRes.data.errors[0].message);
      } else {
        const roles = rolesRes.data.data.roles || [];
        const supervisorRole = roles.find(r => r.roleName && r.roleName.toLowerCase().includes('supervis'));
        if (supervisorRole) {
          supervisorRoleId = supervisorRole.id;
        }
      }

      if (usersRes.data.errors) {
        toast.error("Failed to load supervisors: " + usersRes.data.errors[0].message);
      } else if (supervisorRoleId) {
        const allUsers = usersRes.data.data.users || [];
        const supervisorUsers = allUsers
          .filter(u => u.roleId === supervisorRoleId && u.enable)
          .map(u => u.name);
        setSupervisors(supervisorUsers);
      }

      const page = creditsRes.data.data.supervisorCreditsPage;
      setCredits(page.items);
      setTotalCount(page.totalCount);

      if (creditsRes.data?.data?.allCredits) {
        let all = creditsRes.data.data.allCredits;
        if (selectedSupervisor !== "all") {
          all = all.filter(c => c.supervisorName === selectedSupervisor);
        }
        if (selectedPaymentMode !== "all") {
          all = all.filter(c => c.paymentMode === selectedPaymentMode);
        }
        const searchLower = debouncedSearch.trim().toLowerCase();
        if (searchLower) {
          all = all.filter(c => 
            (c.supervisorName?.toLowerCase().includes(searchLower)) ||
            (c.comment?.toLowerCase().includes(searchLower)) ||
            (c.transactionId?.toLowerCase().includes(searchLower))
          );
        }
        setOverallTotalAmount(all.reduce((sum, c) => sum + c.amount, 0));
      }
    } catch (err) {
      setLoadError(err.message || "Failed to load supervisor credits.");
      toast.error(err.message || "Failed to load supervisor credits.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pageNumber, pageSize, selectedSupervisor, selectedPaymentMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, selectedSupervisor, selectedPaymentMode]);

  const handleAddNew = () => {
    setEditingCredit(null);
    setFormData({
      supervisor: "",
      amount: "",
      paymentMode: "Cash",
      transactionId: "",
      comment: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (credit) => {
    setEditingCredit(credit);
    setFormData({
      supervisor: credit.supervisorName,
      amount: credit.amount,
      paymentMode: credit.paymentMode,
      transactionId: credit.transactionId || "",
      comment: credit.comment || "",
      date: credit.date.split("T")[0],
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: DELETE_CREDIT_MUTATION,
          variables: { id: Number(itemToDelete.id) },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Credit deleted successfully.");
      loadData(false);
    } catch (err) {
      toast.error("Failed to delete credit.");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    
    if (formData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const token = localStorage.getItem("authToken");
    
    try {
      if (editingCredit) {
        const response = await apiClient.post(
          "/graphql",
          {
            query: UPDATE_CREDIT_MUTATION,
            variables: {
              input: {
                id: editingCredit.id,
                supervisorName: formData.supervisor,
                amount: Number(formData.amount),
                paymentMode: formData.paymentMode,
                transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
                comment: formData.comment,
                date: new Date(formData.date).toISOString(),
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

        toast.success("Credit updated successfully.");
      } else {
        const response = await apiClient.post(
          "/graphql",
          {
            query: CREATE_CREDIT_MUTATION,
            variables: {
              input: {
                supervisorName: formData.supervisor,
                amount: Number(formData.amount),
                paymentMode: formData.paymentMode,
                transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
                comment: formData.comment,
                date: new Date(formData.date).toISOString(),
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

        toast.success("Credit added successfully.");
      }
      
      setIsModalOpen(false);
      loadData(false);
    } catch (err) {
      toast.error("Failed to save credit.");
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Supervisor Credit
          </h1>
          <p className="text-gray-600">
            Manage supervisor credit entries and payment details
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#3D36BE" }}
        >
          <Plus className="h-5 w-5" />
          Add Credit
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <h3 className="text-gray-900">{totalCount}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <ReceiptIndianRupee className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount (Overall)</p>
              <h3 className="text-gray-900">
                Rs. {overallTotalAmount.toLocaleString("en-IN")}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by supervisor name or comment..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
        />
        <select
          value={selectedSupervisor}
          onChange={(event) => setSelectedSupervisor(event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
        >
          <option value="all">All Supervisors</option>
          {supervisors.map((supervisor) => (
            <option key={supervisor} value={supervisor}>
              {supervisor}
            </option>
          ))}
        </select>
        <select
          value={selectedPaymentMode}
          onChange={(event) => setSelectedPaymentMode(event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
        >
          <option value="all">All Payment Modes</option>
          <option value="Cash">Cash</option>
          <option value="Check">Check</option>
          <option value="Online">Online</option>
        </select>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
          {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full min-w-[840px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Supervisor</th>
                <th className="px-6 py-4 text-left text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-gray-700">Payment Mode</th>
                <th className="px-6 py-4 text-left text-gray-700">Comment</th>
                <th className="px-6 py-4 text-left text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && credits.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              )}
              {!isLoading && credits.map((credit) => (
                <tr key={credit.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900 capitalize">{credit.supervisorName}</td>
                  <td className="px-6 py-4 text-gray-900">Rs. {credit.amount.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 text-gray-900">{credit.paymentMode}</td>
                  <td className="px-6 py-4 text-gray-900">{credit.comment || "-"}</td>
                  <td className="px-6 py-4 text-gray-900">{new Date(credit.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(credit)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                      >
                        <Edit className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete(credit)}
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

          <div className="block md:hidden">
            {isLoading && (
              <div className="p-6 text-center text-gray-500">
                Loading...
              </div>
            )}
            {!isLoading && credits.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No records found.
              </div>
            )}
            {!isLoading && credits.map((credit) => (
              <div
                key={credit.id}
                className="border-b border-gray-200 p-4 last:border-0 hover:bg-gray-50"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{credit.supervisorName}</p>
                    <p className="text-xs text-gray-500">SC-{credit.id.toString().padStart(3, '0')} • {new Date(credit.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">Rs. {credit.amount.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-500">{credit.paymentMode}</p>
                  </div>
                </div>
                
                <div className="mb-4 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-medium">Comment:</span>
                    <span className="truncate ml-4">{credit.comment || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(credit)}
                      className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                    >
                      <Edit className="h-5 w-5 text-gray-600" />
                    </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(credit)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

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
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingCredit ? "Edit Supervisor Credit" : "Add Supervisor Credit"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Supervisor <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <select
                    value={formData.supervisor}
                    onChange={(event) =>
                      setFormData({ ...formData, supervisor: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    required
                  >
                    <option value="">Select supervisor</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor} value={supervisor}>
                        {supervisor}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Amount <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData({ ...formData, amount: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder="Amount in Rs."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Payment Mode <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        paymentMode: event.target.value,
                        transactionId:
                          event.target.value === "Cash"
                            ? ""
                            : formData.transactionId,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                {(formData.paymentMode === "Check" ||
                  formData.paymentMode === "Online") && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {formData.paymentMode === "Check"
                        ? "Check ID"
                        : "Transaction ID"} <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.transactionId}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          transactionId: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                      placeholder={
                        formData.paymentMode === "Check"
                          ? "e.g. CHK98765"
                          : "e.g. TXN123456"
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Comment
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(event) =>
                      setFormData({ ...formData, comment: event.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder="Enter comment or description"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Date <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(event) =>
                      setFormData({ ...formData, date: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#3D36BE" }}
                >
                  {editingCredit ? "Update" : "Add"} Credit
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Credit"
        message={`Are you sure you want to delete this credit record? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default SupervisorCredit;
