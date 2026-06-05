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
        
        if (format === "pdf") {
          const doc = new jsPDF();
          doc.text("Credit and Debit Report", 14, 15);
          autoTable(doc, {
            startY: 20,
            head: [["ID", "Title", "Site", "Category", "Amount", "Mode", "Date", "Type"]],
            body: data.map(e => [
              e.id, 
              e.title, 
              e.site?.siteName || "-", 
              e.category?.name || "-", 
              e.amount, 
              e.paymentMode, 
              e.date.split("T")[0], 
              e.type
            ]),
          });
          doc.save("Credit_Debit_Report.pdf");
        } else if (format === "excel") {
          const ws = XLSX.utils.json_to_sheet(data.map(e => ({
            ID: e.id,
            Title: e.title,
            Site: e.site?.siteName || "-",
            Category: e.category?.name || "-",
            Amount: e.amount,
            "Payment Mode": e.paymentMode,
            Date: e.date.split("T")[0],
            Type: e.type
          })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Expenses");
          XLSX.writeFile(wb, "Credit_Debit_Report.xlsx");
        }
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
        toast.success("Report downloaded!", { id: "report" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report", { id: "report" });
    }
  };

  const filteredReports = reportTemplates;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
          Reports
        </h1>
        <p className="text-gray-600">
          Generate and download comprehensive reports for your construction
          projects
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" style={{ color: "#3D36BE" }} />
          <h3 className="text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-gray-700">Site</label>
            <select
              value={selectedSite}
              onChange={(event) => setSelectedSite(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
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
            <label className="mb-2 block text-gray-700">Category</label>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
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
            <label className="mb-2 block text-gray-700">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(event) =>
                setDateRange({ ...dateRange, start: event.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
            />
          </div>

          <div>
            <label className="mb-2 block text-gray-700">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(event) =>
                setDateRange({ ...dateRange, end: event.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex flex-1 items-start gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "#3D36BE20" }}
                >
                  <FileText className="h-6 w-6" style={{ color: "#3D36BE" }} />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-gray-900">{report.name}</h3>
                  <p className="mb-2 text-sm text-gray-600">
                    {report.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="rounded bg-gray-100 px-2 py-1">
                      {report.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Last: {report.lastGenerated}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownload(report.name, "pdf")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#3D36BE" }}
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownload(report.name, "excel")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-opacity hover:opacity-90"
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




