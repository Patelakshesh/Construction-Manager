import { AlertCircle, Bell, CheckCircle, Clock } from "lucide-react";

const notifications = [
  {
    id: "1",
    type: "success",
    title: "Expense Approved",
    message:
      "Your expense submission for ₹5,200 (Concrete supplies) has been approved.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    type: "warning",
    title: "Budget Alert",
    message:
      "You have used 84% of your allocated budget. Please monitor spending carefully.",
    time: "5 hours ago",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "Attendance Submitted",
    message: "Daily attendance for 25 workers has been successfully recorded.",
    time: "1 day ago",
    read: true,
  },
  {
    id: "4",
    type: "success",
    title: "Budget Updated",
    message: "Additional budget of ₹15,000 has been allocated to your site.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "5",
    type: "warning",
    title: "Expense Pending",
    message:
      "Your expense for excavator rental (₹1,200) is awaiting admin approval.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "6",
    type: "info",
    title: "System Update",
    message: "New features have been added to the expense management module.",
    time: "3 days ago",
    read: true,
  },
];

function Notifications() {
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const getIcon = (type) => {
    if (type === "success")
      return <CheckCircle className="h-5 w-5 text-[#01B6A8]" />;
    if (type === "warning")
      return <AlertCircle className="h-5 w-5 text-[#F15F7F]" />;
    if (type === "info") return <Bell className="h-5 w-5 text-[#3D35BE]" />;
    return <Bell className="h-5 w-5 text-gray-600" />;
  };

  const getBackgroundColor = (type) => {
    if (type === "success") return "bg-[#EFFFFE] border border-[#A0EBE5]";
    if (type === "warning") return "bg-[#FFF1F0] border border-[#F5CDD5]";
    if (type === "info") return "bg-[#F0EFFF] border border-[#9792E7]";
    return "bg-gray-50 border border-gray-200";
  };

  return (
    <div className="space-y-6 p-6 md:p-8 font-sans">
      <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#353535] font-sans">Notifications</h3>
            <p className="text-sm text-[#717579] font-sans mt-1">
              Stay updated with important alerts
            </p>
          </div>
          {unreadCount > 0 && (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-xs shadow-sm font-sans"
              style={{ backgroundColor: "#3D35BE" }}
            >
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border p-5 shadow-[0px_2px_10px_#D9DAE2] transition-colors ${
              notification.read
                ? "border-[#EBE9FD] bg-white"
                : "border-[#3D35BE] bg-[#F0EFFF]/40"
            }`}
          >
            <div className="flex gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getBackgroundColor(notification.type)}`}
              >
                {getIcon(notification.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <h4 className="text-[16px] font-bold text-[#353535] font-sans truncate">{notification.title}</h4>
                  {!notification.read && (
                    <div
                      className="h-2 w-2 rounded-full mt-2 shrink-0"
                      style={{ backgroundColor: "#3D35BE" }}
                    />
                  )}
                </div>
                <p className="mb-2.5 text-sm text-[#5B6065] font-sans leading-relaxed">
                  {notification.message}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-[#717579] font-sans">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{notification.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] p-5 flex flex-col gap-1">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFFFFE] border border-[#A0EBE5]">
              <CheckCircle className="h-5 w-5 text-[#01B6A8]" />
            </div>
          </div>
          <h4 className="text-xl font-bold text-[#353535] font-sans">2</h4>
          <p className="text-sm text-[#717579] font-sans">Approved Items</p>
        </div>

        <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] p-5 flex flex-col gap-1">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF1F0] border border-[#F5CDD5]">
              <Clock className="h-5 w-5 text-[#F15F7F]" />
            </div>
          </div>
          <h4 className="text-xl font-bold text-[#353535] font-sans">1</h4>
          <p className="text-sm text-[#717579] font-sans">Pending Review</p>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
