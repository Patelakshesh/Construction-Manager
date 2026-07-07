import { useState, useEffect } from "react";
import {
  Calendar,
  Eye,
  Receipt,
  ReceiptIndianRupee,
  TrendingDown,
  X,
} from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

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

const calculateHours = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  const parseToMinutes = (durationStr) => {
    const regex = /^-?PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
    const match = durationStr.match(regex);
    if (!match) {
      if (durationStr.includes(":")) {
        const parts = durationStr.split(":");
        return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
      }
      return 0;
    }
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    return hours * 60 + minutes;
  };
  const startMins = parseToMinutes(startIso);
  const endMins = parseToMinutes(endIso);
  const diffMins = endMins - startMins;
  if (diffMins <= 0) return null;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (m === 0) {
    return `${h} hrs`;
  }
  return `${h}h ${m}m`;
};

function SupervisorHome({ selectedSite, user }) {
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [supervisorCredit, setSupervisorCredit] = useState(0);
  const [supervisorExpenses, setSupervisorExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState(null);

  // Get the current supervisor's name from localStorage
  const getSupervisorName = () => {
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) return JSON.parse(stored)?.name || null;
    } catch { /* ignore */ }
    return user?.name || null;
  };
  const supervisorName = getSupervisorName();

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!selectedSite) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem("authToken");

        const expensesPromise = apiClient.post(
          "/graphql",
          {
            query: `
              query GetRecentExpenses($siteId: Int) {
                expensesPage(pageNumber: 1, pageSize: 5, siteId: $siteId) {
                  items {
                    id
                    amount
                    category { name }
                    date
                    title
                    siteId
                    type
                    paymentMode
                    transactionId
                    receiptImage
                  }
                }
              }
            `,
            variables: { siteId: parseInt(selectedSite.id) },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const attendancePromise = apiClient.post(
          "/graphql",
          {
            query: `
              query GetRecentAttendance($pageSize: Int!, $siteId: Int) {
                attendancesPage(pageNumber: 1, pageSize: $pageSize, siteId: $siteId) {
                  items {
                    id
                    date
                    skilledWorkers
                    semiSkilledWorkers
                    unskilledWorkers
                    contractor { contractorName }
                    siteId
                    startTime
                    endTime
                  }
                }
              }
            `,
            variables: { pageSize: 5, siteId: parseInt(selectedSite.id) },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Fetch supervisor credits for this supervisor
        const creditsPromise = apiClient.post(
          "/graphql",
          {
            query: `
              query GetSupervisorCredits {
                supervisorCredits {
                  amount
                  supervisorName
                }
              }
            `
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Fetch ALL expenses to compute this supervisor's total spending
        const allExpensesPromise = apiClient.post(
          "/graphql",
          {
            query: `
              query GetAllExpensesForBalance {
                expensesPage(pageNumber: 1, pageSize: 10000) {
                  items {
                    amount
                    type
                    createdBy
                  }
                }
              }
            `
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const [expensesRes, attendanceRes, creditsRes, allExpensesRes] = await Promise.all([
          expensesPromise,
          attendancePromise,
          creditsPromise,
          allExpensesPromise,
        ]);

        // Process recent site expenses (for the list)
        if (expensesRes.data?.data?.expensesPage?.items) {
          const siteItems = expensesRes.data.data.expensesPage.items;
          const expensesList = siteItems.filter(e => e.type === "Expense");
          setRecentExpenses(expensesList);
          setTotalExpenses(expensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
        }

        // Process Attendance for the selected site
        if (attendanceRes.data?.data?.attendancesPage?.items) {
          setRecentAttendance(attendanceRes.data.data.attendancesPage.items);
        }

        // Compute supervisor credit total
        if (creditsRes.data?.data?.supervisorCredits && supervisorName) {
          const myCredits = creditsRes.data.data.supervisorCredits.filter(
            c => c.supervisorName?.toLowerCase() === supervisorName.toLowerCase()
          );
          const totalCredit = myCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
          setSupervisorCredit(totalCredit);
        }

        // Compute supervisor's own expenses total
        if (allExpensesRes.data?.data?.expensesPage?.items && supervisorName) {
          const myExpenses = allExpensesRes.data.data.expensesPage.items.filter(
            e => e.type?.toLowerCase() === "expense" &&
                 e.createdBy?.toLowerCase() === supervisorName.toLowerCase()
          );
          const totalMyExp = myExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          setSupervisorExpenses(totalMyExp);
        }

      } catch (error) {
        toast.error(error?.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedSite, supervisorName]);

  const remaining = supervisorCredit - supervisorExpenses;

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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-500 font-sans">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 font-sans">
      {/* Budget Overview Card */}
      <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#353535] font-sans">Budget Overview</h3>
          <span className="rounded-full bg-[#F6F5FF] border border-[#EBE9FD] px-3.5 py-1 text-xs text-[#3D35BE] font-semibold font-sans">
            {selectedSite.siteName}
          </span>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Total Expenses Card */}
            <div className="flex gap-4 p-4 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
              <div 
                className="p-2 rounded-lg border border-[#F5CDD5] flex items-center justify-center shrink-0 bg-[#FFF1F0]" 
                style={{ 
                  width: 48, 
                  height: 48, 
                }}
              >
                <TrendingDown className="h-5 w-5 text-[#F15F7F]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-[#717579] font-medium font-sans">Total Expenses</span>
                <span className="text-xl font-bold text-[#353535] font-sans truncate">
                  ₹{totalExpenses.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Remaining Balance Card */}
            <div className="flex gap-4 p-4 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
              <div 
                className="p-2 rounded-lg border border-[#A0EBE5] flex items-center justify-center shrink-0 bg-[#EFFFFE]" 
                style={{ 
                  width: 48, 
                  height: 48, 
                }}
              >
                <ReceiptIndianRupee className="h-5 w-5 text-[#01B6A8]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-[#717579] font-medium font-sans">Remaining Balance</span>
                <span className="text-xl font-bold text-[#353535] font-sans truncate">
                  {remaining < 0 ? `-₹${Math.abs(remaining).toLocaleString("en-IN")}` : `₹${remaining.toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>

          </div>


        </div>
      </div>

      {/* Recent Expenses List Card */}
      <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5E9F1] px-6 py-4 bg-white">
          <h3 className="text-[17px] font-bold text-[#353535] font-sans">Recent Expenses</h3>
          <ReceiptIndianRupee className="h-5 w-5 text-[#3D35BE]" />
        </div>
        <div className="divide-y divide-gray-100">
          {recentExpenses.length === 0 ? (
             <div className="p-6 text-center text-sm text-[#717579] font-sans">No expenses recorded for this site yet.</div>
          ) : (
            recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="px-6 py-4 transition-colors hover:bg-gray-50/50"
              >
                <div className="flex items-start justify-between min-w-0 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[15px] font-semibold text-[#353535] font-sans truncate capitalize">
                      {expense.category?.name || "Uncategorized"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#5B6065] font-sans truncate max-w-[180px]">
                        {expense.title || "No description"}
                      </span>
                      <span className="text-xs text-[#717579] font-sans">
                        | {formatDate(expense.date)}
                      </span>
                    </div>
                    {expense.receiptImage && (
                      <button
                        type="button"
                        onClick={() => setViewingImage(expense.receiptImage)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#3D35BE] hover:underline font-sans"
                      >
                        <Eye className="h-3 w-3" />
                        View Receipt
                      </button>
                    )}
                  </div>
                  <p className="text-base font-bold text-[#353535] font-sans shrink-0">
                    ₹{expense.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Attendance List Card */}
      <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5E9F1] px-6 py-4 bg-white">
          <h3 className="text-[17px] font-bold text-[#353535] font-sans">Recent Attendance</h3>
          <Calendar className="h-5 w-5 text-[#3D35BE]" />
        </div>
        <div className="divide-y divide-gray-100">
          {recentAttendance.length === 0 ? (
             <div className="p-6 text-center text-sm text-[#717579] font-sans">No attendance recorded for this site yet.</div>
          ) : (
            recentAttendance.map((record) => {
              const totalWorkers = (record.skilledWorkers || 0) + 
                                   (record.semiSkilledWorkers || 0) + 
                                   (record.unskilledWorkers || 0);
              return (
                <div
                  key={record.id}
                  className="px-6 py-4 transition-colors hover:bg-gray-50/50"
                >
                  <div className="flex items-center justify-between min-w-0 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[15px] font-semibold text-[#353535] font-sans truncate">
                        {record.contractor?.contractorName || "Unknown Contractor"}
                      </p>
                      <p className="text-xs text-[#717579] font-sans">
                        {formatDate(record.date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-[#353535] font-sans">
                        {totalWorkers} workers
                      </p>
                      {calculateHours(record.startTime, record.endTime) && (
                        <p className="text-xs text-[#717579] font-sans font-semibold mt-0.5">
                          {calculateHours(record.startTime, record.endTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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
    </div>
  );
}

export default SupervisorHome;
