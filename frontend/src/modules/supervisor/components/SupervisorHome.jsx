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

function SupervisorHome({ selectedSite, user }) {
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!selectedSite) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem("authToken");

        const statsPromise = apiClient.post(
          "/graphql",
          {
            query: `
              query GetSiteStats($siteName: String) {
                dashboardStats(siteName: $siteName) {
                  totalBudget
                  totalExpenses
                }
              }
            `,
            variables: { siteName: selectedSite.siteName },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

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
                  }
                }
              }
            `,
            variables: { pageSize: 5, siteId: parseInt(selectedSite.id) },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const [statsRes, expensesRes, attendanceRes] = await Promise.all([
          statsPromise,
          expensesPromise,
          attendancePromise,
        ]);

        // Process Stats
        if (statsRes.data?.data?.dashboardStats) {
          const stats = statsRes.data.data.dashboardStats;
          setTotalBudget(stats.totalBudget || 0);
          setTotalExpenses(stats.totalExpenses || 0);
        }

        // Process Expenses for the selected site
        if (expensesRes.data?.data?.expensesPage?.items) {
          const siteItems = expensesRes.data.data.expensesPage.items;
          const expensesList = siteItems.filter(e => e.type === "Expense");
          setRecentExpenses(expensesList);
        }

        // Process Attendance for the selected site
        if (attendanceRes.data?.data?.attendancesPage?.items) {
          setRecentAttendance(attendanceRes.data.data.attendancesPage.items);
        }

      } catch (error) {
        toast.error(error?.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedSite]);

  const remaining = totalBudget - totalExpenses;
  const budgetPercentage = totalBudget > 0 ? Math.min((totalExpenses / totalBudget) * 100, 100).toFixed(1) : "0.0";

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Site Budget Card */}
            <div className="flex gap-4 p-4 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
              <div 
                className="p-2 rounded-lg border border-[#EBE9FD] flex items-center justify-center shrink-0" 
                style={{ 
                  width: 48, 
                  height: 48, 
                  background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
                }}
              >
                <ReceiptIndianRupee className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-[#717579] font-medium font-sans">Site Budget</span>
                <span className="text-xl font-bold text-[#353535] font-sans truncate">
                  ₹{totalBudget.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

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
                  ₹{remaining.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-[#5B6065] font-sans font-medium">Budget Used</span>
              <span className="text-[#353535] font-sans font-bold">{budgetPercentage}%</span>
            </div>
            <div className="h-3.5 w-full rounded-full bg-[#E5E9F1] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${budgetPercentage}%`,
                  backgroundColor: budgetPercentage >= 100 ? "#F15F7F" : budgetPercentage > 80 ? "#F59E0B" : "#01B6A8"
                }}
              />
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
                    <p className="mb-1 text-[15px] font-semibold text-[#353535] font-sans truncate">
                      {expense.title || "No description"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-semibold font-sans"
                        style={{ backgroundColor: "#3D35BE15", color: "#3D35BE" }}
                      >
                        {expense.category?.name || "Uncategorized"}
                      </span>
                      <span className="text-xs text-[#717579] font-sans">
                        {new Date(expense.date).toLocaleDateString()}
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
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-[#353535] font-sans">
                        {totalWorkers} workers
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {viewingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
        </div>
      )}
    </div>
  );
}

export default SupervisorHome;
