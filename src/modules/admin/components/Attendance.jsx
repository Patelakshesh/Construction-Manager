import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Calendar, Users, Filter, Eye, X } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import { createPortal } from "react-dom";

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
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [selectedSite, setSelectedSite] = useState("all");

  const [attendances, setAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allAttendances, setAllAttendances] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterPopupState, setFilterPopupState] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
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
                  image
                }
                totalCount
              }
              attendances {
                id
                date
                siteId
                site { siteName }
                contractor { contractorName }
                supervisor { name }
                skilledWorkers
                semiSkilledWorkers
                unskilledWorkers
                startTime
                endTime
                image
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
    
    if (!matchesSite || !matchesStart || !matchesEnd) return false;

    // Apply column filters
    for (const [col, selectedValues] of Object.entries(columnFilters)) {
      if (selectedValues && selectedValues.length > 0) {
        let val = record[col];
        if (col === 'site') val = record.site?.siteName || "—";
        if (col === 'contractor') val = record.contractor?.contractorName || "—";
        if (col === 'supervisor') val = record.supervisor?.name || "—";
        if (col === 'date') val = formatDate(record.date);
        if (col === 'startTime' || col === 'endTime') val = formatDuration(record[col]);
        if (col === 'totalHours') val = calculateHours(record.startTime, record.endTime) || "—";
        
        if (!selectedValues.includes(String(val))) {
          return false;
        }
      }
    }
    return true;
  });

  const currentTotalCount = filteredAll.length;
  const startIndex = (pageNumber - 1) * pageSize;
  const currentAttendances = filteredAll.slice(startIndex, startIndex + pageSize);

  const toggleFilter = (col, value) => {
    setColumnFilters(prev => {
      const current = prev[col] || [];
      if (current.includes(value)) {
        return { ...prev, [col]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [col]: [...current, value] };
      }
    });
    setPageNumber(1); // Reset to first page when filter changes
  };

  const renderFilterHeader = (title, colKey, dataExtractor) => {
    const allValues = Array.from(new Set(allAttendances.map(dataExtractor))).filter(Boolean);
    let isActive = false;
    if (colKey === "date") {
      isActive = startDate || endDate;
    } else {
      isActive = columnFilters[colKey] && columnFilters[colKey].length > 0;
    }
    
    return (
      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans whitespace-nowrap">
        <div className="flex items-center gap-2">
          {title}
          <button 
            onClick={(e) => {
              if (activeFilterColumn === colKey) {
                setActiveFilterColumn(null);
                setFilterPopupState(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveFilterColumn(colKey);
                if (colKey === "date") {
                  setTempStartDate(startDate);
                  setTempEndDate(endDate);
                }
                setFilterPopupState({ colKey, title, rect, allValues });
              }
            }}
            className={`p-1 rounded transition-colors ${isActive ? 'bg-[#3D35BE] text-white' : 'text-[#717579] hover:bg-gray-200'}`}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </th>
    );
  };

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

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full font-sans">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  {renderFilterHeader("Date", "date", r => formatDate(r.date))}
                  {renderFilterHeader("Site", "site", r => r.site?.siteName || "—")}
                  {renderFilterHeader("Contractor", "contractor", r => r.contractor?.contractorName || "—")}
                  {renderFilterHeader("Supervisor", "supervisor", r => r.supervisor?.name || "—")}
                  {renderFilterHeader("Skilled", "skilledWorkers", r => String(r.skilledWorkers))}
                  {renderFilterHeader("Semi-Skilled", "semiSkilledWorkers", r => String(r.semiSkilledWorkers))}
                  {renderFilterHeader("Unskilled", "unskilledWorkers", r => String(r.unskilledWorkers))}
                  {renderFilterHeader("In Time", "startTime", r => formatDuration(r.startTime))}
                  {renderFilterHeader("Out Time", "endTime", r => formatDuration(r.endTime))}
                  {renderFilterHeader("Total Hours", "totalHours", r => calculateHours(r.startTime, r.endTime) || "—")}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#3D35BE] font-sans">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading attendance...
                    </td>
                  </tr>
                ) : currentAttendances.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-8 text-center text-gray-500 font-sans">
                      No data available
                    </td>
                  </tr>
                ) : (
                  currentAttendances.map((record) => (
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {record.image && (
                            <button
                              type="button"
                              onClick={() => setViewingImage(record.image)}
                              className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#3D35BE]"
                              title="View Image"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          )}
                        </div>
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
            ) : currentAttendances.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-sans">
                No data available
              </div>
            ) : (
              currentAttendances.map((record) => (
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
                    <span className="inline-flex items-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-xs font-semibold text-[#01B6A8] px-2.5 py-1 font-sans whitespace-nowrap shrink-0">
                      {calculateHours(record.startTime, record.endTime) || "—"}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-[#5B6065]">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Contractor:</span>
                      <span className="font-sans text-right break-words">{record.contractor?.contractorName || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Supervisor:</span>
                      <span className="font-sans text-right break-words">{record.supervisor?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Skilled Workers:</span>
                      <span className="font-sans text-right break-words">{record.skilledWorkers}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Semi-Skilled Workers:</span>
                      <span className="font-sans text-right break-words">{record.semiSkilledWorkers}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Unskilled Workers:</span>
                      <span className="font-sans text-right break-words">{record.unskilledWorkers}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Timing:</span>
                      <span className="font-sans text-right break-words">
                        {formatDuration(record.startTime)} - {formatDuration(record.endTime)}
                      </span>
                    </div>
                  </div>
                  {record.image && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setViewingImage(record.image)}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-100 text-[#3D35BE] text-sm font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View Image
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={currentTotalCount}
              onPageChange={(nextPage) => setPageNumber(nextPage)}
            />
          </div>
        </div>
      </div>

      {/* Global Filter Popup */}
      {filterPopupState && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => { setActiveFilterColumn(null); setFilterPopupState(null); }}
          />
          <div 
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl"
            style={{ 
              top: filterPopupState.rect.bottom + 4, 
              left: filterPopupState.rect.left,
              width: 192 
            }}
          >
            <div className="p-2 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">Filter {filterPopupState.title}</span>
              <button 
                onClick={() => { 
                  if (filterPopupState.colKey === "date") {
                    setStartDate("");
                    setEndDate("");
                    setTempStartDate("");
                    setTempEndDate("");
                  } else {
                    setColumnFilters(p => ({...p, [filterPopupState.colKey]: []})); 
                  }
                  setPageNumber(1); 
                  setActiveFilterColumn(null); 
                  setFilterPopupState(null);
                }} 
                className="text-xs text-[#3D35BE] hover:underline"
              >
                Clear
              </button>
            </div>
            {filterPopupState.colKey === "date" ? (
              <div className="p-3 flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} className="w-full border rounded p-1 text-sm text-[#353535]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                  <input type="date" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} className="w-full border rounded p-1 text-sm text-[#353535]" />
                </div>
                <button 
                  onClick={() => { 
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setActiveFilterColumn(null); 
                    setFilterPopupState(null); 
                  }}
                  className="bg-[#3D35BE] text-white rounded py-1.5 text-sm font-semibold w-full mt-1 hover:bg-[#2d2794] transition-colors"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {filterPopupState.allValues.map(val => (
                  <label key={val} className="flex items-center gap-2 text-sm text-[#353535] cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={(columnFilters[filterPopupState.colKey] || []).includes(String(val))}
                      onChange={() => toggleFilter(filterPopupState.colKey, String(val))}
                      className="rounded border-gray-300 text-[#3D35BE] focus:ring-[#3D35BE]"
                    />
                    <span className="truncate">{val}</span>
                  </label>
                ))}
                {filterPopupState.allValues.length === 0 && <span className="text-xs text-gray-400 p-1">No options</span>}
              </div>
            )}
          </div>
        </>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img 
              src={viewingImage} 
              alt="Attendance Record" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-transparent"
            />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

export default Attendance;
