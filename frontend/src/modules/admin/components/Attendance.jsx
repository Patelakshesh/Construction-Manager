import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Calendar, Users } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";

const formatDuration = (durationStr) => {
  if (!durationStr) return "--:--";
  const regex = /^-?PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
  const match = durationStr.match(regex);
  if (!match) {
    if (durationStr.includes(":")) {
      return durationStr.slice(0, 5);
    }
    return durationStr;
  }
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
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

function Attendance() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSite, setSelectedSite] = useState("all");

  const [attendances, setAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allAttendances, setAllAttendances] = useState([]);
  const pageSize = 10;

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadData();
  }, [pageNumber, selectedSite, startDate, endDate]);

  useEffect(() => {
    setPageNumber(1);
  }, [selectedSite, startDate, endDate]);

  const loadMetadata = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetAttendanceMetadata {
              sites {
                id
                siteName
              }
            }
          `
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setSites(response.data.data.sites || []);
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
      
      let startVar = null;
      if (startDate) {
        startVar = new Date(startDate).toISOString();
      }
      
      let endVar = null;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        endVar = end.toISOString();
      }

      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetAttendancesPage($pageNumber: Int!, $pageSize: Int!, $siteId: Int, $startDate: DateTime, $endDate: DateTime) {
              attendancesPage(pageNumber: $pageNumber, pageSize: $pageSize, siteId: $siteId, startDate: $startDate, endDate: $endDate) {
                items {
                  id
                  date
                  site { siteName }
                  contractor { contractorName }
                  supervisor { name }
                  skilledWorkers
                  semiSkilledWorkers
                  unskilledWorkers
                  startTime
                  endTime
                }
                totalCount
              }
              attendances {
                date
                siteId
                skilledWorkers
                semiSkilledWorkers
                unskilledWorkers
              }
            }
          `,
          variables: {
            pageNumber,
            pageSize,
            siteId: selectedSite === "all" ? null : parseInt(selectedSite),
            startDate: startVar,
            endDate: endVar,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setAttendances(response.data.data.attendancesPage?.items || []);
        setTotalCount(response.data.data.attendancesPage?.totalCount || 0);
        setAllAttendances(response.data.data.attendances || []);
      }
    } catch (error) {
      console.error("Failed to load attendances page", error);
      toast.error(error?.message || "Failed to load attendance data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAll = allAttendances.filter((record) => {
    const recordDate = record.date.split("T")[0];
    const matchesSite = selectedSite === "all" || String(record.siteId) === String(selectedSite);
    const matchesStart = !startDate || recordDate >= startDate;
    const matchesEnd = !endDate || recordDate <= endDate;
    return matchesSite && matchesStart && matchesEnd;
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecords = filteredAll.filter(
    (record) => record.date.split("T")[0] === todayStr,
  );
  const totalWorkers = filteredAll.reduce(
    (sum, record) =>
      sum +
      (record.skilledWorkers || 0) +
      (record.semiSkilledWorkers || 0) +
      (record.unskilledWorkers || 0),
    0,
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">


      {/* Stats Cards Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Today Records Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{todayRecords.length}</span>
            <span className="text-base text-[#4E5159] font-normal">Today's Records</span>
          </div>
        </div>

        {/* Total Workers Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalWorkers}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Workers</span>
          </div>
        </div>

        {/* Total Entries Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3C368D 0deg, #857FF4 100%)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{filteredAll.length}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Entries</span>
          </div>
        </div>
      </div>

      {/* Main Container Card (Table & Actions) */}
      <div 
        className="w-full bg-white flex flex-col gap-7 min-w-0" 
        style={{ 
          paddingLeft: 24, 
          paddingRight: 24, 
          paddingTop: 30, 
          paddingBottom: 30, 
          borderTopRightRadius: 20, 
          borderBottomRightRadius: 20, 
          borderBottomLeftRadius: 20 
        }}
      >
        <div 
          className="w-full flex flex-col overflow-hidden rounded-lg min-w-0" 
          style={{ outline: '1px rgba(61, 53, 190, 0.26) solid' }}
        >
          {/* Header Row: Filters */}
          <div className="w-full bg-white p-6 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-center gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase font-sans">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full h-11 px-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase font-sans">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full h-11 px-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase font-sans">Site</label>
              <select
                value={selectedSite}
                onChange={(event) => setSelectedSite(event.target.value)}
                className="w-full h-11 px-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans font-medium"
              >
                <option value="all">All Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.siteName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full font-sans">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Site</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Contractor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Supervisor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans text-center">Skilled</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans text-center">Semi-Skilled</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans text-center">Unskilled</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">In Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Out Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading attendance...
                    </td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500 font-sans">
                      No data available
                    </td>
                  </tr>
                ) : (
                  attendances.map((record) => (
                    <tr
                      key={record.id}
                      className="h-[78px] transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans whitespace-nowrap">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {record.site?.siteName || "—"}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans capitalize">
                        {record.contractor?.contractorName || "—"}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans capitalize">
                        {record.supervisor?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans text-center">
                        {record.skilledWorkers}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans text-center">
                        {record.semiSkilledWorkers}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans text-center">
                        {record.unskilledWorkers}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {formatDuration(record.startTime)}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {formatDuration(record.endTime)}
                      </td>
                      <td className="px-6 py-4 text-base text-[#3E424E] font-semibold font-sans">
                        {calculateHours(record.startTime, record.endTime) || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden bg-white divide-y divide-gray-100 font-sans">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500 font-sans">
                Loading attendance...
              </div>
            ) : attendances.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-sans">
                No data available
              </div>
            ) : (
              attendances.map((record) => (
                <div
                  key={record.id}
                  className="p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 capitalize text-base font-sans">
                        {record.site?.siteName || "—"}
                      </p>
                      <p className="text-xs text-gray-500 font-sans">
                        {formatDate(record.date)}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-xs font-semibold text-[#01B6A8] px-2.5 py-1 font-sans">
                      {calculateHours(record.startTime, record.endTime) || "—"}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-[#5B6065]">
                    <div className="flex justify-between">
                      <span className="font-medium text-[#3E424E] font-sans">Contractor:</span>
                      <span className="font-sans">{record.contractor?.contractorName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#3E424E] font-sans">Supervisor:</span>
                      <span className="font-sans">{record.supervisor?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#3E424E] font-sans">Skilled Workers:</span>
                      <span className="font-sans">{record.skilledWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#3E424E] font-sans">Semi-Skilled Workers:</span>
                      <span className="font-sans">{record.semiSkilledWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#3E424E] font-sans">Unskilled Workers:</span>
                      <span className="font-sans">{record.unskilledWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#3E424E] font-sans">Timing:</span>
                      <span className="font-sans">
                        {formatDuration(record.startTime)} - {formatDuration(record.endTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

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
    </div>
  );
}

export default Attendance;
