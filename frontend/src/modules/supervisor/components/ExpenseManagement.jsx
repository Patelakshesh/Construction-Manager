import { useState, useEffect } from "react";
import { Camera, Plus, ReceiptIndianRupee, X, Filter } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import Pagination from "../../../shared/components/Pagination";

const CREATE_EXPENSE_MUTATION = `
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
    }
  }
`;

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
  const pageSize = 10;

  const [formData, setFormData] = useState({
    amount: "",
    categoryId: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    transactionId: "",
  });

  const loadData = async () => {
    if (!selectedSite) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetExpensesAndCategories($pageNumber: Int!, $pageSize: Int!, $siteId: Int) {
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
                }
                totalCount
              }
              expenses {
                amount
                siteId
              }
              categories { id name }
            }
          `,
          variables: {
            pageNumber,
            pageSize,
            siteId: parseInt(selectedSite.id),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.data) {
        const pageItems = response.data.data.expensesPage?.items || [];
        setExpenses(pageItems);
        setTotalCount(response.data.data.expensesPage?.totalCount || 0);

        const allExpenses = response.data.data.expenses || [];
        const siteExpenses = allExpenses.filter(
          e => String(e.siteId) === String(selectedSite.id)
        );
        const total = siteExpenses.reduce((sum, e) => sum + e.amount, 0);
        setTotalExpensesAmount(total);

        const loadedCategories = response.data.data.categories || [];
        setCategories(loadedCategories);
        
        if (loadedCategories.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: loadedCategories[0].id }));
        }
      }
    } catch (error) {
      toast.error("Failed to load expenses data");
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
      errors.title = "Description is required.";
    }
    if (!formData.date) {
      errors.date = "Date is required.";
    }
    if (formData.paymentMode !== "Cash" && !formData.transactionId.trim()) {
      errors.transactionId = `${
        formData.paymentMode === "Check" ? "Check ID" : "Transaction ID"
      } is required.`;
    }
    return errors;
  };

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

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
      const response = await apiClient.post(
        "/graphql",
        {
          query: CREATE_EXPENSE_MUTATION,
          variables: {
            input: {
              title: formData.title,
              siteId: Number(selectedSite.id),
              categoryId: Number(formData.categoryId),
              amount: Number(formData.amount),
              paymentMode: formData.paymentMode,
              transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
              date: new Date(formData.date).toISOString(),
              type: "Expense", // Default to expense for supervisor
              createdBy: user?.name || "supervisor",
            },
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Expense added successfully!");
      setIsAdding(false);
      setFormData({
        amount: "",
        categoryId: categories.length > 0 ? categories[0].id : "",
        title: "",
        date: new Date().toISOString().split("T")[0],
        paymentMode: "Cash",
        transactionId: "",
      });
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedSite) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-500">
        Please select a site to manage expenses.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Current Site
        </p>
        <h3 className="text-gray-900">{selectedSite.siteName}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm col-span-2">
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
            <ReceiptIndianRupee className="h-4 w-4" />
            <p>Total Recorded Expenses for Site</p>
          </div>
          <h3 className="text-gray-900">₹{totalExpensesAmount.toLocaleString("en-IN")}</h3>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#3D36BE" }}
      >
        <Plus className="h-5 w-5" />
        Add New Expense
      </button>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No expenses found for this site.</div>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="rounded px-2 py-1 text-xs"
                        style={{
                          backgroundColor:
                            expense.type === "Income"
                              ? "#DCFCE7"
                              : "#FEE2E2",
                          color:
                            expense.type === "Income"
                              ? "#15803D"
                              : "#DC2626",
                        }}
                      >
                        {expense.type}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {expense.category?.name || "Uncategorized"}
                      </span>
                    </div>
                    <p className="mb-1 text-gray-900 font-medium">{expense.title}</p>
                    <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                    {expense.paymentMode !== "Cash" && (
                      <p className="text-xs text-gray-400 mt-1">
                        {expense.paymentMode} • {expense.transactionId}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-gray-900 font-semibold">
                      ₹{expense.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 py-3">
          <Pagination
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={(nextPage) => setPageNumber(nextPage)}
          />
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-gray-900">Add New Expense</h3>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1 */}
                  <div>
                    <label className="mb-2 block text-gray-700">
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

                  <div>
                    <label className="mb-2 block text-gray-700">
                      Category <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          categoryId: event.target.value,
                        })
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

                  {/* Row 2 */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-gray-700">
                      Description <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <textarea
                      value={formData.title}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          title: event.target.value,
                        })
                      }
                      className={getFieldClassName(Boolean(formErrors.title))}
                      placeholder="Enter description of expense"
                      rows={2}
                      required
                    />
                    {renderFieldError(formErrors.title)}
                  </div>

                  {/* Row 3 */}
                  <div>
                    <label className="mb-2 block text-gray-700">
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

                  <div>
                    <label className="mb-2 block text-gray-700">
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
                      className={getFieldClassName(Boolean(formErrors.paymentMode))}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Online">Online</option>
                    </select>
                    {renderFieldError(formErrors.paymentMode)}
                  </div>

                  {/* Row 4 (Conditional Transaction ID) */}
                  {(formData.paymentMode === "Check" || formData.paymentMode === "Online") && (
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-gray-700">
                        {formData.paymentMode === "Check" ? "Check Number" : "Transaction ID"} <span className="text-[#EC3F3F]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.transactionId}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            transactionId: event.target.value,
                          })
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
                  )}

                  {/* Upload Receipt */}
                  <div className="md:col-span-2 mt-2">
                    <label className="mb-2 block text-gray-700">
                      Upload Bill/Receipt
                    </label>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 transition-colors hover:border-[#3D36BE]"
                    >
                      <Camera className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-600">
                        Take Photo / Upload Image
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg px-4 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#3D36BE" }}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Expense"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setFormErrors({});
                    }}
                    className="flex-1 rounded-lg bg-gray-200 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseManagement;
