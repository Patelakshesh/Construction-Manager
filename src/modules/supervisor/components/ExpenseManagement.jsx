import { useState, useEffect } from "react";
import { Camera, Plus, ReceiptIndianRupee, X, Filter, Eye, Edit, Trash2 } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import { createPortal } from "react-dom";

const CREATE_EXPENSE_MUTATION = `
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
    }
  }
`;

const UPDATE_EXPENSE_MUTATION = `
  mutation UpdateExpense($input: UpdateExpenseInput!) {
    updateExpense(input: $input) {
      id
    }
  }
`;

const DELETE_EXPENSE_MUTATION = `
  mutation DeleteExpense($id: Int!) {
    deleteExpense(id: $id)
  }
`;

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  let s = dateStr;
  if (typeof s !== "string") {
    try {
      s = new Date(s).toISOString();
    } catch {
      return "—";
    }
  }
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  }
  return "—";
};

function ExpenseManagement({ selectedSite, user }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTransactionType, setFilterTransactionType] = useState("All");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState(0);
  const [viewingImage, setViewingImage] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 10;

  const [formData, setFormData] = useState({
    amount: "",
    categoryId: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    transactionId: "",
    receiptImage: null,
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type is image
    if (!file.type.startsWith("image/")) {
      setFormErrors(prev => ({
        ...prev,
        receiptImage: "File must be an image (PNG, JPG, JPEG, WEBP)."
      }));
      toast.error("Please upload an image file");
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors(prev => ({
        ...prev,
        receiptImage: "Image size exceeds the 2MB limit."
      }));
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        receiptImage: reader.result
      }));
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.receiptImage;
        return copy;
      });
      toast.success("Image uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const loadData = async () => {
    if (!selectedSite) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetExpensesAndCategories($pageNumber: Int!, $pageSize: Int!, $siteId: Int, $siteName: String) {
              expensesPage(pageNumber: $pageNumber, pageSize: $pageSize, siteId: $siteId) {
                items {
                  id
                  title
                  siteId
                  categoryId
                  category { name }
                  amount
                  paymentMode
                  transactionId
                  date
                  type
                  receiptImage
                  createdBy
                }
                totalCount
              }
              dashboardStats(siteName: $siteName) {
                totalExpenses
              }
              categories { id name }
            }
          `,
          variables: {
            pageNumber,
            pageSize,
            siteId: parseInt(selectedSite.id),
            siteName: selectedSite.siteName,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.data) {
        const pageItems = response.data.data.expensesPage?.items || [];
        setExpenses(pageItems);
        setTotalCount(response.data.data.expensesPage?.totalCount || 0);

        const stats = response.data.data.dashboardStats;
        setTotalExpensesAmount(stats?.totalExpenses || 0);

        const loadedCategories = response.data.data.categories || [];
        setCategories(loadedCategories);
        
        if (loadedCategories.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: loadedCategories[0].id }));
        }
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load expenses data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSite, pageNumber]);

  useEffect(() => {
    setPageNumber(1);
  }, [selectedSite]);

  const validateForm = () => {
    const errors = {};
    if (!formData.amount) {
      errors.amount = "Amount is required.";
    } else if (Number(formData.amount) <= 0) {
      errors.amount = "Amount must be greater than 0.";
    }
    if (!formData.categoryId) {
      errors.categoryId = "Category is required.";
    }
    if (!formData.title.trim()) {
      errors.title = "Title is required.";
    }
    if (!formData.date) {
      errors.date = "Date is required.";
    }
    if (formData.paymentMode !== "Cash" && !formData.transactionId.trim()) {
      errors.transactionId = `${
        formData.paymentMode === "Check" ? "Check ID" : "Transaction ID"
      } is required.`;
    }
    // Receipt image is optional
    return errors;
  };

  const getFieldClassName = (hasError) =>
    `w-full h-12 rounded-lg border px-4 focus:outline-none focus:ring-2 font-sans ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-[#C8D9EF] focus:ring-[#3D35BE] text-[#353535]"
    }`;

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const handleEdit = (expense) => {
    setEditingItem(expense);
    setFormData({
      amount: String(expense.amount),
      categoryId: expense.categoryId || "",
      title: expense.title,
      date: expense.date.split("T")[0],
      paymentMode: expense.paymentMode || "Cash",
      transactionId: expense.transactionId || "",
      receiptImage: expense.receiptImage || null,
    });
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: DELETE_EXPENSE_MUTATION,
          variables: { id: Number(itemToDelete) },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Expense deleted successfully.");
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to delete expense");
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("authToken");
      const isEdit = !!editingItem;
      const mutation = isEdit ? UPDATE_EXPENSE_MUTATION : CREATE_EXPENSE_MUTATION;
      const variables = {
        input: {
          ...(isEdit ? { id: Number(editingItem.id) } : {}),
          title: formData.title,
          siteId: Number(selectedSite.id),
          categoryId: Number(formData.categoryId),
          amount: Number(formData.amount),
          paymentMode: formData.paymentMode,
          transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
          date: new Date(formData.date).toISOString(),
          type: "Expense", // Default to expense for supervisor
          ...(isEdit ? { modifiedBy: user?.name || "supervisor" } : { createdBy: user?.name || "supervisor" }),
          receiptImage: formData.receiptImage,
        },
      };

      const response = await apiClient.post(
        "/graphql",
        {
          query: mutation,
          variables,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success(isEdit ? "Expense updated successfully!" : "Expense added successfully!");
      setIsAdding(false);
      setEditingItem(null);
      setFormData({
        amount: "",
        categoryId: categories.length > 0 ? categories[0].id : "",
        title: "",
        date: new Date().toISOString().split("T")[0],
        paymentMode: "Cash",
        transactionId: "",
        receiptImage: null,
      });
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedSite) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-red-800 font-sans">
            You are not assigned to any site. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 font-sans">
      {/* Current Site & Total Stats Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] px-6 py-5 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#717579] font-sans mb-1">
            Current Site
          </p>
          <h3 className="text-lg font-bold text-[#353535] font-sans">{selectedSite.siteName}</h3>
        </div>
        
        <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] px-6 py-5 flex-1 flex items-center gap-4">
          <div 
            className="p-2 rounded-lg border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 44, 
              height: 44, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <ReceiptIndianRupee className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#717579] font-sans mb-0.5">Total Expenses for Site</p>
            <h3 className="text-xl font-bold text-[#353535] font-sans truncate">₹{totalExpensesAmount.toLocaleString("en-IN")}</h3>
          </div>
        </div>
      </div>

      {/* Add New Expense Primary Button */}
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-white text-base font-bold transition-all shadow-[0px_2px_10px_rgba(61,53,190,0.25)] hover:scale-[1.01] active:scale-[0.99] font-sans"
        style={{ backgroundColor: "#3D35BE" }}
      >
        <Plus className="h-5 w-5" />
        Add New Expense
      </button>

      {/* Main Container Card (Table & Actions) */}
      <div 
        className="w-full bg-white flex flex-col min-w-0 rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]" 
        style={{ 
          paddingLeft: 24, 
          paddingRight: 24, 
          paddingTop: 30, 
          paddingBottom: 30, 
        }}
      >
        <div 
          className="w-full flex flex-col overflow-hidden rounded-lg min-w-0" 
          style={{ outline: '1px rgba(61, 53, 190, 0.26) solid' }}
        >
          {isLoading ? (
            <div className="p-8 text-center text-[#717579] font-sans bg-white">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-[#717579] font-sans bg-white">No expenses found for this site.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                    <tr className="h-[68px]">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Title</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Category</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Payment Mode</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Added By</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="h-[78px] transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-4 text-base text-[#5B6065] font-semibold font-sans capitalize">
                          {expense.title}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {expense.category?.name || "—"}
                        </td>
                        <td className="px-6 py-4 text-base text-[#3E424E] font-bold font-sans">
                          ₹{expense.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {expense.paymentMode} {expense.transactionId ? `(${expense.transactionId})` : ""}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans capitalize">
                          {expense.createdBy || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center justify-center rounded-lg px-3 py-1 font-sans text-sm font-semibold"
                            style={{
                              backgroundColor:
                                expense.type === "Income"
                                  ? "#EFFFFE"
                                  : "#FFF1F0",
                              border:
                                expense.type === "Income"
                                    ? "1px solid #A0EBE5"
                                    : "1px solid #F5CDD5",
                              color:
                                expense.type === "Income"
                                  ? "#01B6A8"
                                  : "#F15F7F",
                            }}
                          >
                            {expense.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {expense.receiptImage && (
                              <button
                                type="button"
                                onClick={() => setViewingImage(expense.receiptImage)}
                                className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#3D35BE]"
                                title="View Receipt"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                            )}
                            {(expense.createdBy || "").toLowerCase() === (user?.name || "").toLowerCase() && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(expense)}
                                  className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                                  title="Edit"
                                >
                                  <Edit className="h-5 w-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(expense.id)}
                                  className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                                  title="Delete"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden bg-white divide-y divide-gray-100">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#353535] capitalize text-base font-sans">
                          {expense.title}
                        </p>
                        <span
                          className="inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-xs font-semibold font-sans mt-1"
                          style={{
                            backgroundColor:
                              expense.type === "Income"
                                ? "#EFFFFE"
                                : "#FFF1F0",
                            border:
                              expense.type === "Income"
                                  ? "1px solid #A0EBE5"
                                  : "1px solid #F5CDD5",
                            color:
                              expense.type === "Income"
                                ? "#01B6A8"
                                : "#F15F7F",
                          }}
                        >
                          {expense.type}
                        </span>
                      </div>
                      <p className="text-[17px] text-[#353535] font-bold font-sans">
                        ₹{expense.amount.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="mb-4 space-y-2 text-sm text-[#5B6065] font-sans">
                      <div className="flex justify-between">
                        <span className="font-medium text-[#717579]">Category:</span>
                        <span>{expense.category?.name || "Uncategorized"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-[#717579]">Payment Mode:</span>
                        <span>{expense.paymentMode}</span>
                      </div>
                      {expense.transactionId && (
                        <div className="flex justify-between">
                          <span className="font-medium text-[#717579]">Transaction ID:</span>
                          <span>{expense.transactionId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-medium text-[#717579]">Added By:</span>
                        <span className="capitalize">{expense.createdBy || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-[#717579]">Date:</span>
                        <span>{formatDate(expense.date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                      {expense.receiptImage && (
                        <button
                          type="button"
                          onClick={() => setViewingImage(expense.receiptImage)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#3D35BE]"
                          title="View Receipt"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                      {(expense.createdBy || "").toLowerCase() === (user?.name || "").toLowerCase() && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(expense)}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(expense.id)}
                            className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={(nextPage) => setPageNumber(nextPage)}
            />
          </div>
        </div>
      </div>

      {isAdding && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto md:items-center">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 md:p-8">
            <div className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#353535] font-sans">
                  {editingItem ? "Edit Expense" : "Add New Expense"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingItem(null);
                    setFormData({
                      amount: "",
                      categoryId: categories.length > 0 ? categories[0].id : "",
                      title: "",
                      date: new Date().toISOString().split("T")[0],
                      paymentMode: "Cash",
                      transactionId: "",
                      receiptImage: null,
                    });
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Col 1: Title */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
                      Title <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(event) =>
                        setFormData({ ...formData, title: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.title))}
                      placeholder="e.g. Cement Purchase"
                      required
                    />
                    {renderFieldError(formErrors.title)}
                  </div>

                  {/* Col 2: Amount */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
                      Amount (₹) <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={(event) =>
                        setFormData({ ...formData, amount: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.amount))}
                      placeholder="Enter amount"
                      required
                    />
                    {renderFieldError(formErrors.amount)}
                  </div>

                  {/* Col 1: Category */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
                      Category <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(event) =>
                        setFormData({ ...formData, categoryId: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.categoryId))}
                      required
                    >
                      <option value="" disabled>Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError(formErrors.categoryId)}
                  </div>

                  {/* Col 2: Date */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
                      Date <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(event) =>
                        setFormData({ ...formData, date: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.date))}
                      required
                    />
                    {renderFieldError(formErrors.date)}
                  </div>

                  {/* Col 1: Payment Mode */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
                      Payment Mode <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          paymentMode: event.target.value,
                          transactionId: event.target.value === "Cash" ? "" : formData.transactionId,
                        })
                      }
                      className={getFieldClassName(Boolean(formErrors.paymentMode))}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Online">Online</option>
                    </select>
                    {renderFieldError(formErrors.paymentMode)}
                  </div>

                  {/* Col 2: Check Number / Transaction ID (only if not Cash) */}
                  {(formData.paymentMode === "Check" || formData.paymentMode === "Online") ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
                        {formData.paymentMode === "Check" ? "Check Number" : "Transaction ID"}{" "}
                        <span className="text-[#EC3F3F]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.transactionId}
                        onChange={(event) =>
                          setFormData({ ...formData, transactionId: event.target.value })
                        }
                        className={getFieldClassName(Boolean(formErrors.transactionId))}
                        placeholder={
                          formData.paymentMode === "Check"
                            ? "e.g. CHK123456"
                            : "e.g. TXN987654321"
                        }
                        required
                      />
                      {renderFieldError(formErrors.transactionId)}
                    </div>
                  ) : (
                    <div /> /* empty spacer to keep grid alignment */
                  )}

                  {/* Upload Receipt — full width, always last */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-[#5B6065] font-sans">
                      Upload Bill/Receipt{" "}
                      <span className="text-xs font-normal text-gray-400 font-sans">(Optional)</span>
                    </label>
                    <p className="mb-3 text-xs text-[#717579] font-sans">
                      Supported formats: PNG, JPG, JPEG, WEBP (Max size: 2MB)
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8D9EF] py-3 transition-colors hover:border-[#3D35BE] hover:bg-gray-50/50">
                        <Camera className="h-5 w-5 text-[#717579]" />
                        <span className="text-sm text-[#5B6065] font-semibold font-sans">
                          {formData.receiptImage ? "Change Photo / Image" : "Take Photo / Upload Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      {renderFieldError(formErrors.receiptImage)}
                      {formData.receiptImage && (
                        <div className="relative mt-2 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                          <img
                            src={formData.receiptImage}
                            alt="Receipt preview"
                            className="h-auto w-full max-h-48 object-contain bg-gray-50"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, receiptImage: null }))}
                            className="absolute top-2 right-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 transition-colors shadow"
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 h-12 rounded-lg text-white font-bold text-base transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                    style={{ backgroundColor: "#3D35BE" }}
                  >
                    {isSubmitting ? "Submitting..." : editingItem ? "Update Expense" : "Submit Expense"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingItem(null);
                      setFormErrors({});
                      setFormData({
                        amount: "",
                        categoryId: categories.length > 0 ? categories[0].id : "",
                        title: "",
                        date: new Date().toISOString().split("T")[0],
                        paymentMode: "Cash",
                        transactionId: "",
                        receiptImage: null,
                      });
                    }}
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 h-12 rounded-lg border border-[#3D35BE] bg-white text-[#3D35BE] font-semibold text-base transition-all hover:bg-[#F0EFFF] disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {viewingImage && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-3xl w-full overflow-hidden rounded-2xl bg-white p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-5 right-5 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors z-10 shadow-lg"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center justify-center p-4 bg-gray-50 min-h-[300px] rounded-xl">
              <img
                src={viewingImage}
                alt="Receipt Bill"
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default ExpenseManagement;
