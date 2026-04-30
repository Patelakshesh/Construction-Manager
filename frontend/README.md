# Construction Site Management App (React)

This project is configured with:

- React + Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React (icons)
- Recharts (charts)

The UI style and module behavior are aligned with your existing "Construction Site Management App" reference.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Module-wise Folder Structure

```text
src/
	app/
		AppRouter.jsx
	modules/
		auth/
			components/
				LoginScreen.jsx
		admin/
			components/
				AdminDashboard.jsx
				DashboardHome.jsx
				SiteManagement.jsx
				UserManagement.jsx
				Analytics.jsx
				Reports.jsx
		supervisor/
			components/
				SupervisorApp.jsx
				SupervisorHome.jsx
				ExpenseManagement.jsx
				AttendanceManagement.jsx
				Notifications.jsx
	shared/
		services/
			apiClient.js
	App.jsx
	index.css
	main.jsx
```

## Login Demo

- Choose `Admin` role to open Admin Dashboard modules.
- Choose `Supervisor` role to open Supervisor modules.
- Any email/password works in demo mode.
