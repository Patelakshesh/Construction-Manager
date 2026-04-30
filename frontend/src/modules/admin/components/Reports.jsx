import { useState } from "react";
import { Calendar, Download, FileText, Filter } from "lucide-react";

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

const sites = [
  "All Sites",
  "Downtown Plaza",
  "Riverside Complex",
  "Industrial Park",
  "Suburban Mall",
  "Tech Campus",
];

const categories = [
  "All Categories",
  "Financial",
  "Performance",
  "HR",
  "Management",
];

function Reports() {
  const [selectedSite, setSelectedSite] = useState("All Sites");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [dateRange, setDateRange] = useState({
    start: "2026-01-01",
    end: "2026-04-27",
  });

  const handleDownload = (reportName, format) => {
    window.alert(`Downloading ${reportName} as ${format.toUpperCase()}`);
  };

  const filteredReports = reportTemplates.filter((report) => {
    if (
      selectedCategory !== "All Categories" &&
      report.category !== selectedCategory
    ) {
      return false;
    }
    if (selectedSite === "All Sites") {
      return true;
    }
    return report.name
      .toLowerCase()
      .includes(selectedSite.split(" ")[0].toLowerCase());
  });

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
          <Filter className="h-5 w-5" style={{ color: "#FDB71A" }} />
          <h3 className="text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-gray-700">Site</label>
            <select
              value={selectedSite}
              onChange={(event) => setSelectedSite(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
            >
              {sites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-gray-700">Category</label>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
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
                  style={{ backgroundColor: "#FDB71A20" }}
                >
                  <FileText className="h-6 w-6" style={{ color: "#FDB71A" }} />
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
                style={{ backgroundColor: "#FDB71A" }}
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
