import { useState, useEffect } from "react";
import { Calendar, Download, FileText, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";

const reportTemplates = [
  {
    id: "1",
    name: "Credit and Debit Report",
    description: "Detailed breakdown of all expenses by site and category",
    category: "Financial",
    lastGenerated: "2026-04-20",
  },
  {
    id: "2",
    name: "Workforce Attendance Report",
    description: "Worker attendance and labor hours by site",
    category: "HR",
    lastGenerated: "2026-04-26",
  },
];

function Reports() {
  const [reports, setReports] = useState(() => {
    return reportTemplates.map(r => {
      const savedDate = localStorage.getItem(`report_last_generated_${r.id}`);
      return {
        ...r,
        lastGenerated: savedDate || "Never"
      };
    });
  });

  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSite, setSelectedSite] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: "2026-01-01",
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await apiClient.post(
          "/graphql",
          {
            query: `
              query GetReportFilters {
                sites {
                  id
                  siteName
                  enable
                }
                categories {
                  id
                  name
                }
              }
            `
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data?.data) {
          setSites((response.data.data.sites || []).filter(s => s.enable));
          setCategories(response.data.data.categories || []);
        }
      } catch (error) {
        console.error("Failed to load report filters", error);
        toast.error(error?.message || "Failed to load report filters");
      } finally {
        setIsLoadingFilters(false);
      }
    };
    loadFiltersData();
  }, []);

  const handleDownload = async (reportName, format) => {
    try {
      const token = localStorage.getItem("authToken");
      if (reportName === "Credit and Debit Report") {
        toast.loading("Generating report...", { id: "report" });
        const response = await apiClient.post(
          "/graphql",
          {
            query: `
              query GetReportExpenses {
                expensesPage(pageNumber: 1, pageSize: 10000) {
                  items {
                    id
                    title
                    siteId
                    site { siteName }
                    categoryId
                    category { name }
                    amount
                    paymentMode
                    date
                    type
                  }
                }
              }
            `
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let data = response.data?.data?.expensesPage?.items || [];
        
        // Apply Filters
        if (selectedSite !== "All") {
          data = data.filter(e => String(e.siteId) === String(selectedSite));
        }
        if (selectedCategory !== "All") {
          data = data.filter(e => String(e.categoryId) === String(selectedCategory));
        }
        if (dateRange.start) {
          data = data.filter(e => e.date.split("T")[0] >= dateRange.start);
        }
        if (dateRange.end) {
          data = data.filter(e => e.date.split("T")[0] <= dateRange.end);
        }
        
        // Sort data by date ascending
        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentBalance = 0;
        const statementData = data.map(e => {
          const isIncome = e.type === "Income";
          const amount = parseFloat(e.amount) || 0;
          const credit = isIncome ? amount : 0;
          const debit = !isIncome ? amount : 0;
          currentBalance += credit - debit;
          
          return {
            id: e.id,
            date: e.date.split("T")[0],
            description: e.title,
            site: e.site?.siteName || "-",
            category: e.category?.name || "-",
            paymentMode: e.paymentMode,
            credit: credit,
            debit: debit,
            balance: currentBalance,
          };
        });

        const totalCredit = statementData.reduce((sum, e) => sum + (e.credit || 0), 0);
        const totalDebit = statementData.reduce((sum, e) => sum + (e.debit || 0), 0);
        const finalBalance = currentBalance;

        if (format === "pdf") {
          const doc = new jsPDF("landscape");
          
          const siteName = selectedSite !== "All" ? (sites.find(s => String(s.id) === String(selectedSite))?.siteName || selectedSite) : "All Sites";
          const reportTitle = selectedSite !== "All" ? `Financial Ledger - ${siteName}` : "Consolidated Financial Ledger";

          doc.setFontSize(18);
          doc.setTextColor(40, 40, 40);
          doc.text(reportTitle, 14, 20);
          
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
          
          let yPos = 34;
          if (selectedSite === "All") {
            doc.text(`Site: All Sites`, 14, yPos);
            yPos += 6;
          }
          if (dateRange.start || dateRange.end) {
             doc.text(`Period: ${dateRange.start || 'Start'} to ${dateRange.end || 'Present'}`, 14, yPos);
             yPos += 6;
          }

          const formatCurrency = (amt) => {
            return "Rs. " + amt.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          };

          const formatNumber = (amt) => {
            return amt.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          };

          autoTable(doc, {
            startY: yPos + 4,
            head: [["Date", "Description", "Site", "Category", "Mode", "Credit (+, Rs.)", "Debit (-, Rs.)", "Balance (Rs.)"]],
            body: statementData.map(e => [
              e.date, 
              e.description, 
              e.site, 
              e.category, 
              e.paymentMode, 
              e.credit ? formatNumber(e.credit) : "-", 
              e.debit ? formatNumber(e.debit) : "-", 
              formatNumber(e.balance)
            ]),
            foot: [[
              { content: 'TOTAL', colSpan: 5, styles: { halign: 'right' } },
              { content: formatCurrency(totalCredit), styles: { halign: 'right' } },
              { content: formatCurrency(totalDebit), styles: { halign: 'right' } },
              { content: formatCurrency(finalBalance), styles: { halign: 'right' } }
            ]],
            theme: 'striped',
            headStyles: { fillColor: [61, 54, 190] },
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            showFoot: 'lastPage',
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
              5: { halign: 'right' },
              6: { halign: 'right' },
              7: { halign: 'right', fontStyle: 'bold' }
            }
          });
          doc.save("Credit and Debit Report.pdf");
        } else if (format === "excel") {
          const excelData = statementData.map(e => ({
            Date: e.date,
            Description: e.description,
            Site: e.site,
            Category: e.category,
            "Payment Mode": e.paymentMode,
            "Credit (+)": e.credit,
            "Debit (-)": e.debit,
            Balance: e.balance
          }));
          
          excelData.push({
            Date: "",
            Description: "TOTAL",
            Site: "",
            Category: "",
            "Payment Mode": "",
            "Credit (+)": totalCredit,
            "Debit (-)": totalDebit,
            Balance: finalBalance
          });

          const ws = XLSX.utils.json_to_sheet(excelData, { origin: "A6" });
          
          // Add Title Headers
          const siteName = selectedSite !== "All" ? (sites.find(s => String(s.id) === String(selectedSite))?.siteName || selectedSite) : "All Sites";
          const periodText = (dateRange.start || dateRange.end) ? `${dateRange.start || 'Start'} to ${dateRange.end || 'Present'}` : "All Time";
          const reportTitle = selectedSite !== "All" ? `FINANCIAL LEDGER - ${siteName.toUpperCase()}` : "CONSOLIDATED FINANCIAL LEDGER";
          
          XLSX.utils.sheet_add_aoa(ws, [
            [reportTitle],
            [`Generated on: ${new Date().toLocaleDateString()}`],
            [`Site: ${siteName}`],
            [`Period: ${periodText}`]
          ], { origin: "A1" });

          // Format Column Widths
          ws["!cols"] = [
            { wch: 15 }, // Date
            { wch: 40 }, // Description
            { wch: 25 }, // Site
            { wch: 25 }, // Category
            { wch: 15 }, // Mode
            { wch: 15 }, // Credit
            { wch: 15 }, // Debit
            { wch: 20 }  // Balance
          ];

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Statement");
          XLSX.writeFile(wb, "Credit and Debit Report.xlsx");
        }
        const todayStr = new Date().toISOString().split("T")[0];
        localStorage.setItem("report_last_generated_1", todayStr);
        setReports(prev => prev.map(r => r.id === "1" ? { ...r, lastGenerated: todayStr } : r));
        toast.success("Report downloaded!", { id: "report" });
      } else if (reportName === "Workforce Attendance Report") {
        toast.loading("Generating report...", { id: "report" });
        const response = await apiClient.post(
          "/graphql",
          {
            query: `
              query GetReportAttendances {
                attendancesPage(pageNumber: 1, pageSize: 10000) {
                  items {
                    id
                    date
                    siteId
                    site { siteName }
                    contractor { contractorName }
                    supervisor { name }
                    skilledWorkers
                    semiSkilledWorkers
                    unskilledWorkers
                  }
                }
              }
            `
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let data = response.data?.data?.attendancesPage?.items || [];
        
        // Apply Filters
        if (selectedSite !== "All") {
          data = data.filter(a => String(a.siteId) === String(selectedSite));
        }
        if (dateRange.start) {
          data = data.filter(a => a.date.split("T")[0] >= dateRange.start);
        }
        if (dateRange.end) {
          data = data.filter(a => a.date.split("T")[0] <= dateRange.end);
        }
        
        if (format === "pdf") {
          const doc = new jsPDF();
          doc.text("Workforce Attendance Report", 14, 15);
          autoTable(doc, {
            startY: 20,
            head: [["ID", "Date", "Site", "Contractor", "Supervisor", "Skilled", "Semi-Skilled", "Unskilled"]],
            body: data.map(a => [
              a.id, 
              a.date.split("T")[0], 
              a.site?.siteName || "-", 
              a.contractor?.contractorName || "-", 
              a.supervisor?.name || "-", 
              a.skilledWorkers, 
              a.semiSkilledWorkers, 
              a.unskilledWorkers
            ]),
            theme: 'striped',
            headStyles: { fillColor: [61, 54, 190] },
            styles: { fontSize: 10, cellPadding: 3 }
          });
          doc.save("Workforce_Attendance_Report.pdf");
        } else if (format === "excel") {
          const ws = XLSX.utils.json_to_sheet(data.map(a => ({
            ID: a.id,
            Date: a.date.split("T")[0],
            Site: a.site?.siteName || "-",
            Contractor: a.contractor?.contractorName || "-",
            Supervisor: a.supervisor?.name || "-",
            Skilled: a.skilledWorkers,
            "Semi-Skilled": a.semiSkilledWorkers,
            Unskilled: a.unskilledWorkers
          })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Attendance");
          XLSX.writeFile(wb, "Workforce_Attendance_Report.xlsx");
        }
        const todayStr = new Date().toISOString().split("T")[0];
        localStorage.setItem("report_last_generated_2", todayStr);
        setReports(prev => prev.map(r => r.id === "2" ? { ...r, lastGenerated: todayStr } : r));
        toast.success("Report downloaded!", { id: "report" });
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to generate report", { id: "report" });
    }
  };

  const filteredReports = reports;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl font-sans">
          Reports
        </h1>
        <p className="text-[#4E5159] mt-1 text-base font-normal">
          Generate and download comprehensive reports for your construction projects
        </p>
      </div>

      {/* Main Container Card for Filters */}
      <div 
        className="w-full bg-white flex flex-col gap-6 mb-8" 
        style={{ 
          paddingLeft: 24, 
          paddingRight: 24, 
          paddingTop: 30, 
          paddingBottom: 30, 
          borderTopRightRadius: 20, 
          borderBottomRightRadius: 20, 
          borderBottomLeftRadius: 20,
          border: '1px solid #EBE9FD',
          boxShadow: '0px 2px 10px #D9DAE2'
        }}
      >
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <Filter className="h-5 w-5" style={{ color: "#3D35BE" }} />
          <h3 className="text-lg font-bold text-[#353535] font-sans">Filters</h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase font-sans">Site</label>
            <select
              value={selectedSite}
              onChange={(event) => setSelectedSite(event.target.value)}
              className="w-full h-11 px-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
            >
              <option value="All">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase font-sans">Category</label>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full h-11 px-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
            >
              <option value="All">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase font-sans">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(event) =>
                setDateRange({ ...dateRange, start: event.target.value })
              }
              className="w-full h-11 px-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase font-sans">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(event) =>
                setDateRange({ ...dateRange, end: event.target.value })
              }
              className="w-full h-11 px-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
            />
          </div>
        </div>
      </div>

      {/* Reports Card Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="bg-white p-6 rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] transition-shadow hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start gap-4 mb-6">
              <div 
                className="p-3 rounded-lg border border-[#EBE9FD] flex items-center justify-center shadow-sm shrink-0" 
                style={{ 
                  width: 52, 
                  height: 52, 
                  background: 'rgba(61, 53, 190, 0.1)' 
                }}
              >
                <FileText className="h-6 w-6 text-[#3D35BE]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-[#353535] mb-1 font-sans truncate">{report.name}</h3>
                <p className="text-[#717579] text-sm mb-4 font-sans leading-relaxed">
                  {report.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center justify-center rounded-lg bg-[#F0EFFF] border border-[#EBE9FD] text-xs font-semibold text-[#3D35BE] px-3 py-1 font-sans capitalize">
                    {report.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-sm text-[#717579] font-sans">
                    <Calendar className="h-4 w-4 text-[#717579]" />
                    <span>Last: {report.lastGenerated}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => handleDownload(report.name, "pdf")}
                className="h-11 px-6 bg-[#3D35BE] hover:bg-[#322bad] text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2 font-sans flex-1"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownload(report.name, "excel")}
                className="h-11 px-6 bg-[#3D35BE] hover:bg-[#322bad] text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2 font-sans flex-1"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Reports;




