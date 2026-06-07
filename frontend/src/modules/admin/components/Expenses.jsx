import { useState, useEffect } from "react";
import {
  CreditCard,
  Edit,
  Plus,
  ReceiptIndianRupee,
  Trash2,
  X,
  Eye,
  Camera,
} from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import useDebounce from "../../../shared/hooks/useDebounce";
import Pagination from "../../../shared/components/Pagination";

function Expenses() {
  const [transactions, setTransactions] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterSite, setFilterSite] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewingImage, setViewingImage] = useState(null);
  const pageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("Expense"); // "Income" or "Expense"
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    siteId: "",
    categoryId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    transactionId: "",
    receiptImage: "",
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type is image
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, WEBP)");
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        receiptImage: reader.result
      }));
      toast.success("Image uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const [totalCount, setTotalCount] = useState(0);
  const [allTransactions, setAllTransactions] = useState([]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadData();
  }, [pageNumber, filterSite, debouncedSearch]);

  useEffect(() => {
    setPageNumber(1);
  }, [filterSite, debouncedSearch]);

  const loadMetadata = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetExpensesMetadata {
              sites { id siteName }
              categories { id name }
            }
          `
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setSites(response.data.data.sites || []);
        setCategories(response.data.data.categories || []);
      }
    } catch (error) {
      console.error("Failed to load metadata", error);
      toast.error(error?.message || "Failed to load metadata");
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetExpensesPage($pageNumber: Int!, $pageSize: Int!, $search: String, $siteId: Int) {
              expensesPage(pageNumber: $pageNumber, pageSize: $pageSize, search: $search, siteId: $siteId) {
                items {
                  id
                  title
                  siteId
                  site { siteName }
                  categoryId
                  category { name }
                  amount
                  paymentMode
                  transactionId
                  date
                  type
                  receiptImage
                }
                totalCount
              }
              expenses {
                type
                siteId
                title
                category { name }
                transactionId
                receiptImage
              }
            }
          `,
          variables: {
            pageNumber,
            pageSize,
            search: debouncedSearch.trim() || null,
            siteId: filterSite === "all" ? null : parseInt(filterSite),
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setTransactions(response.data.data.expensesPage?.items || []);
        setTotalCount(response.data.data.expensesPage?.totalCount || 0);
        setAllTransactions(response.data.data.expenses || []);
      }
    } catch (error) {
      console.error("Failed to load expenses data", error);
      toast.error(error?.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAll = allTransactions.filter((t) => {
    const matchesSite = filterSite === "all" || String(t.siteId) === String(filterSite);
    const catName = t.category?.name || "";
    const matchesSearch =
      !debouncedSearch ||
      t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (t.transactionId && t.transactionId.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      catName.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesSite && matchesSearch;
  });

  const totalIncome = filteredAll.filter((t) => t.type === "Income").length;
  const totalExpense = filteredAll.filter((t) => t.type === "Expense").length;

  const paginatedTransactions = transactions;

  const handleAddNew = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData({
      title: "",
      siteId: "",
      categoryId: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "Cash",
      transactionId: "",
      receiptImage: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (transaction) => {
    setModalType(transaction.type);
    setEditingItem(transaction);
    setFormData({
      title: transaction.title,
      siteId: transaction.siteId || "",
      categoryId: transaction.categoryId || "",
      amount: String(transaction.amount),
      date: transaction.date.split("T")[0],
      paymentMode: transaction.paymentMode || "Cash",
      transactionId: transaction.transactionId || "",
      receiptImage: transaction.receiptImage || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const token = localStorage.getItem("authToken");
      await apiClient.post(
        "/graphql",
        {
          query: `mutation DeleteExpense($id: Int!) { deleteExpense(id: $id) }`,
          variables: { id: parseInt(id) }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Record deleted");
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to delete record");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const token = localStorage.getItem("authToken");
      const isIncome = modalType === "Income";
      const variables = {
        input: {
          ...formData,
          id: editingItem ? editingItem.id : undefined,
          siteId: formData.siteId ? parseInt(formData.siteId) : null,
          categoryId: (!isIncome && formData.categoryId) ? parseInt(formData.categoryId) : null,
          amount: parseFloat(formData.amount),
          type: modalType,
          date: new Date(formData.date).toISOString(),
          receiptImage: formData.receiptImage || null
        }
      };
      
      const query = editingItem
        ? `mutation UpdateExpense($input: UpdateExpenseInput!) { updateExpense(input: $input) { id } }`
        : `mutation CreateExpense($input: CreateExpenseInput!) { createExpense(input: $input) { id } }`;
        
      const response = await apiClient.post(
        "/graphql",
        { query, variables },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data?.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }
      
      toast.success(`${modalType} ${editingItem ? "updated" : "added"} successfully`);
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to save record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Income and Expense
          </h1>
          <p className="text-gray-600">
            View all recorded project income and expenses across sites
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleAddNew("Income")}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-5 w-5" />
            Add Income
          </button>
          <button
            type="button"
            onClick={() => handleAddNew("Expense")}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#3D36BE" }}
          >
            <Plus className="h-5 w-5" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by ID, title, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
        />
        <select
          value={filterSite}
          onChange={(e) => setFilterSite(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] sm:w-48"
        >
          <option value="all">All Sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.siteName}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <h3 className="text-gray-900">
                {totalIncome}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#3D36BE20" }}
            >
              <ReceiptIndianRupee
                className="h-6 w-6"
                style={{ color: "#3D36BE" }}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <h3 className="text-gray-900">
                {totalExpense}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-700">Title</th>
                  <th className="px-6 py-4 text-left text-gray-700">Site</th>
                  <th className="px-6 py-4 text-left text-gray-700">Category</th>
                  <th className="px-6 py-4 text-left text-gray-700">Amount</th>
                  <th className="px-6 py-4 text-left text-gray-700">
                    Payment Mode
                  </th>
                  <th className="px-6 py-4 text-left text-gray-700">Date</th>
                  <th className="px-6 py-4 text-left text-gray-700">Type</th>
                  <th className="px-6 py-4 text-left text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      Loading income and expenses...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No data available
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-gray-900">
                        {transaction.title}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {transaction.site?.siteName || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {transaction.category?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        Rs. {Number(transaction.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {transaction.paymentMode}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {transaction.date.split("T")[0]}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            transaction.type === "Income"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {transaction.receiptImage && (
                            <button
                              type="button"
                              onClick={() => setViewingImage(transaction.receiptImage)}
                              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                              title="View Receipt"
                            >
                              <Eye className="h-5 w-5 text-[#3D36BE]" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(transaction)}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(transaction.id)}
                            className="rounded-lg p-2 transition-colors hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">
                Loading income and expenses...
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No data available
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border-b border-gray-200 p-4 last:border-0 hover:bg-gray-50"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {transaction.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.site?.siteName || "—"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        transaction.type === "Income"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">Category:</span>
                      <span>{transaction.category?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Amount:</span>
                      <span className="font-semibold text-gray-900">
                        Rs. {Number(transaction.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Payment Mode:</span>
                      <span>{transaction.paymentMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Date:</span>
                      <span>{transaction.date.split("T")[0]}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    {transaction.receiptImage && (
                      <button
                        type="button"
                        onClick={() => setViewingImage(transaction.receiptImage)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                        title="View Receipt"
                      >
                        <Eye className="h-5 w-5 text-[#3D36BE]" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(transaction)}
                      className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(transaction.id)}
                      className="rounded-lg p-2 transition-colors hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingItem ? `Edit ${modalType}` : `Add ${modalType}`}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder={
                      modalType === "Expense"
                        ? "e.g. Cement Purchase"
                        : "e.g. Client Payment Advance"
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Site <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.siteId}
                    onChange={(e) =>
                      setFormData({ ...formData, siteId: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                  >
                    <option value="" disabled>
                      Select site
                    </option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.siteName}
                      </option>
                    ))}
                  </select>
                </div>

                {modalType === "Expense" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.categoryId}
                        onChange={(e) =>
                          setFormData({ ...formData, categoryId: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                      >
                        <option value="" disabled>
                          Select category
                        </option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                        placeholder="Amount in Rs."
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                      placeholder="Amount in Rs."
                    />
                  </div>
                )}

                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentMode: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                      <option value="Check">Check</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    />
                  </div>
                </>

                {(formData.paymentMode === "Check" ||
                  formData.paymentMode === "Online") && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Transaction ID / Check Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.transactionId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          transactionId: e.target.value,
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

                {/* Upload Receipt (Admin) */}
                {formData.paymentMode === "Online" && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Upload Bill/Receipt
                    </label>
                    <p className="mb-2 text-xs text-gray-500">
                      Supported formats: PNG, JPG, JPEG, WEBP (Max size: 2MB)
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 transition-colors hover:border-[#3D36BE] hover:bg-gray-50">
                        <Camera className="h-5 w-5 text-gray-500" />
                        <span className="text-sm text-gray-600 font-medium">
                          {formData.receiptImage ? "Change Photo / Image" : "Upload Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      
                      {formData.receiptImage && (
                        <div className="relative mt-1 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                          <img
                            src={formData.receiptImage}
                            alt="Receipt preview"
                            className="h-auto w-full max-h-48 object-contain bg-gray-50"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, receiptImage: "" }))}
                            className="absolute top-2 right-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition-colors shadow"
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#3D36BE" }}
                >
                  {isSaving ? "Saving..." : `${editingItem ? "Update" : "Add"} ${modalType}`}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
      {viewingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-w-3xl w-full overflow-hidden rounded-lg bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors z-10"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center justify-center p-4 bg-gray-50 min-h-[300px]">
              <img
                src={viewingImage}
                alt="Receipt Bill"
                className="max-h-[80vh] w-auto max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;




