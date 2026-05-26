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
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    if (type === "warning")
      return <AlertCircle className="h-6 w-6 text-yellow-600" />;
    if (type === "info") return <Bell className="h-6 w-6 text-blue-600" />;
    return <Bell className="h-6 w-6 text-gray-600" />;
  };

  const getBackgroundColor = (type) => {
    if (type === "success") return "bg-green-50";
    if (type === "warning") return "bg-yellow-50";
    if (type === "info") return "bg-blue-50";
    return "bg-gray-50";
  };

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">
              Stay updated with important alerts
            </p>
          </div>
          {unreadCount > 0 && (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: "#3D36BE" }}
            >
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border p-4 shadow-sm ${
              notification.read
                ? "border-gray-200 bg-white"
                : "border-[#3D36BE] bg-[#3D36BE0A]"
            }`}
          >
            <div className="flex gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${getBackgroundColor(notification.type)}`}
              >
                {getIcon(notification.type)}
              </div>

              <div className="flex-1">
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-gray-900">{notification.title}</h4>
                  {!notification.read && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "#3D36BE" }}
                    />
                  )}
                </div>
                <p className="mb-2 text-sm text-gray-600">
                  {notification.message}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{notification.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <h4 className="mb-1 text-gray-900">2</h4>
          <p className="text-sm text-gray-600">Approved Items</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <h4 className="mb-1 text-gray-900">1</h4>
          <p className="text-sm text-gray-600">Pending Review</p>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
