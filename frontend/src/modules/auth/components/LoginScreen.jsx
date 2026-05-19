import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import logoImage from "../../../assets/logo.png";
import heroImage from "../../../assets/main_image.jpg";
import apiClient from "../../../shared/services/apiClient";

function LoginScreen({ onLogin }) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedMobileNumber = mobileNumber.trim();
    const trimmedPassword = password.trim();
    const nextErrors = {};

    if (!trimmedMobileNumber) {
      nextErrors.mobileNumber = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(trimmedMobileNumber)) {
      nextErrors.mobileNumber = "Enter a valid 10-digit mobile number.";
    }

    if (!trimmedPassword) {
      nextErrors.password = "Password is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setStatus({ type: "error", message: "Please fix the errors below." });
      return;
    }

    setFormErrors({});
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/graphql/public", {
        query:
          "mutation Login($input: LoginInput!) { login(input: $input) { token expiresOn user { id mobileNumber name roleId address email createdOn createdBy modifiedOn modifiedBy } } }",
        variables: {
          input: {
            mobileNumber: trimmedMobileNumber,
            password: trimmedPassword,
          },
        },
      });

      if (response?.data?.errors?.length) {
        const apiMessage = response.data.errors[0]?.message || "Login failed.";
        setStatus({ type: "error", message: apiMessage });
        return;
      }

      const loginPayload = response?.data?.data?.login;
      if (!loginPayload?.token || !loginPayload?.user) {
        setStatus({ type: "error", message: "Invalid login response." });
        return;
      }

      const roleMap = {
        1: "admin",
        2: "supervisor",
      };
      const apiUser = loginPayload.user;
      const resolvedRole = roleMap[Number(apiUser.roleId)] || role;
      const normalizedUser = {
        id: apiUser.id,
        name: apiUser.name,
        role: resolvedRole,
        mobileNumber: apiUser.mobileNumber || trimmedMobileNumber,
        email: apiUser.email,
        address: apiUser.address,
        createdOn: apiUser.createdOn,
        createdBy: apiUser.createdBy,
        modifiedOn: apiUser.modifiedOn,
        modifiedBy: apiUser.modifiedBy,
      };

     
        localStorage.setItem("authToken", loginPayload.token);
        localStorage.setItem("authUser", JSON.stringify(normalizedUser));
        localStorage.setItem("authExpiresOn", loginPayload.expiresOn || "");

      setStatus({ type: "success", message: "Login successful. Redirecting..." });
      onLogin(resolvedRole, normalizedUser);
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to login. Please try again.";
      setStatus({ type: "error", message: apiMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBanner = status?.message ? (
    <div
      className={`rounded-lg border px-3 py-2 text-sm font-semibold xl:text-base ${
        status.type === "success"
          ? "border-[#C7E9D5] bg-[#E7F6EE] text-[#0F6B38]"
          : "border-[#F4C7C7] bg-[#FDECEC] text-[#A11B1B]"
      }`}
    >
      {status.message}
    </div>
  ) : null;

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  // ── Desktop form
  const desktopForm = (
    <form onSubmit={handleSubmit} className="space-y-4 xl:space-y-5 2xl:space-y-6">
      {statusBanner}
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#717579] xl:text-base">
          Role
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F5F6F8] p-1 xl:p-1.5">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors xl:rounded-2xl xl:py-3"
            style={{
              backgroundColor: role === "admin" ? "#FDB71A" : "#F5F5F5",
              color: role === "admin" ? "white" : "#4A4D57",
            }}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole("supervisor")}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors xl:rounded-2xl xl:py-3"
            style={{
              backgroundColor: role === "supervisor" ? "#FDB71A" : "#F5F5F5",
              color: role === "supervisor" ? "white" : "#4A4D57",
            }}
          >
            Supervisor
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#717579] xl:text-base">
          Mobile Number<span className="text-[#EC3F3F]">*</span>
        </label>
        <div className="flex h-[52px] items-center gap-3 rounded-xl border border-[#DFE0E2] bg-[#F9FAFC] px-4 xl:h-[62px] xl:rounded-2xl xl:px-5 2xl:h-[70px]">
          <Mail className="h-4 w-4 shrink-0 text-[#F09E39] xl:h-5 xl:w-5" />
          <input
            type="tel"
            inputMode="numeric"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Enter mobile number"
            className="w-full border-0 bg-transparent p-0 text-sm text-[#1F2937] placeholder:text-[#A5A3A3] focus:outline-none focus:ring-0 xl:text-base"
          />
        </div>
        {renderFieldError(formErrors.mobileNumber)}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#717579] xl:text-base">
          Password<span className="text-[#EC3F3F]">*</span>
        </label>
        <div className="flex h-[52px] items-center gap-3 rounded-xl border border-[#DFE0E2] bg-[#F9FAFC] px-4 xl:h-[62px] xl:rounded-2xl xl:px-5 2xl:h-[70px]">
          <Lock className="h-4 w-4 shrink-0 text-[#F09E39] xl:h-5 xl:w-5" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full border-0 bg-transparent p-0 text-sm text-[#1F2937] placeholder:text-[#A5A3A3] focus:outline-none focus:ring-0 xl:text-base"
          />
        </div>
        {renderFieldError(formErrors.password)}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[#414651] xl:text-sm 2xl:text-base">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[#A5A3A3] xl:h-4 xl:w-4"
          />
          <span>Remember me</span>
        </label>
        <button type="button" className="font-semibold text-[#1F2937]">
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 h-[52px] w-full rounded-[10px] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 xl:mt-6 xl:h-[62px] xl:text-lg 2xl:mt-8 2xl:h-[70px] 2xl:text-xl"
        style={{ backgroundColor: "#F09E39" }}
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );

  // ── Mobile form — uses CSS custom properties via inline style for iPhone SE
  const mobileForm = (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col"
      style={{ gap: "clamp(8px, 2vh, 14px)" }}
    >
      {statusBanner}
      {/* Role */}
      <div className="shrink-0">
        <label
          className="mb-1 block font-semibold text-[#717579]"
          style={{ fontSize: "clamp(10px, 2.2vw, 13px)" }}
        >
          Role
        </label>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F5F6F8] p-1">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className="rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: role === "admin" ? "#FDB71A" : "#F5F5F5",
              color: role === "admin" ? "white" : "#4A4D57",
              fontSize: "clamp(10px, 2.5vw, 13px)",
              padding: "clamp(6px, 1.5vh, 10px) 16px",
            }}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole("supervisor")}
            className="rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: role === "supervisor" ? "#FDB71A" : "#F5F5F5",
              color: role === "supervisor" ? "white" : "#4A4D57",
              fontSize: "clamp(10px, 2.5vw, 13px)",
              padding: "clamp(6px, 1.5vh, 10px) 16px",
            }}
          >
            Supervisor
          </button>
        </div>
      </div>

      {/* Email */}
      <div className="shrink-0">
        <label
          className="mb-1 block font-semibold text-[#717579]"
          style={{ fontSize: "clamp(10px, 2.2vw, 13px)" }}
        >
          Mobile Number<span className="text-[#EC3F3F]">*</span>
        </label>
        <div
          className="flex items-center gap-2.5 rounded-xl border border-[#DFE0E2] bg-[#F9FAFC] px-3.5"
          style={{ height: "clamp(36px, 7vh, 44px)" }}
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-[#F09E39]" />
          <input
            type="tel"
            inputMode="numeric"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Enter mobile number"
            className="w-full border-0 bg-transparent p-0 text-[#1F2937] placeholder:text-[#A5A3A3] focus:outline-none focus:ring-0"
            style={{ fontSize: "clamp(10px, 2.5vw, 13px)" }}
          />
        </div>
        {renderFieldError(formErrors.mobileNumber)}
      </div>

      {/* Password */}
      <div className="shrink-0">
        <label
          className="mb-1 block font-semibold text-[#717579]"
          style={{ fontSize: "clamp(10px, 2.2vw, 13px)" }}
        >
          Password<span className="text-[#EC3F3F]">*</span>
        </label>
        <div
          className="flex items-center gap-2.5 rounded-xl border border-[#DFE0E2] bg-[#F9FAFC] px-3.5"
          style={{ height: "clamp(36px, 7vh, 44px)" }}
        >
          <Lock className="h-3.5 w-3.5 shrink-0 text-[#F09E39]" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full border-0 bg-transparent p-0 text-[#1F2937] placeholder:text-[#A5A3A3] focus:outline-none focus:ring-0"
            style={{ fontSize: "clamp(10px, 2.5vw, 13px)" }}
          />
        </div>
        {renderFieldError(formErrors.password)}
      </div>

      {/* Remember me / Forgot */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 text-[#414651]"
        style={{ fontSize: "clamp(9px, 2vw, 11px)" }}
      >
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-3 w-3 rounded border-[#A5A3A3]"
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          className="font-semibold text-[#1F2937]"
          style={{ fontSize: "clamp(9px, 2vw, 11px)" }}
        >
          Forgot Password?
        </button>
      </div>

      {/* Spacer pushes Login to bottom */}
      <div className="flex-1" />

      {/* Login Button — always at bottom, never cut off */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full shrink-0 rounded-[10px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        style={{
          backgroundColor: "#F09E39",
          height: "clamp(40px, 7.5vh, 48px)",
          fontSize: "clamp(12px, 2.8vw, 15px)",
        }}
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-white">

      {/* ===================== DESKTOP & TABLET — md+ (768px+) ===================== */}
      <div className="hidden h-full md:flex">
        <div 
          className="relative h-full w-1/2 rounded-tr-[40px] rounded-br-[40px] bg-gray-900 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
        </div>

        <div className="flex h-full w-1/2 items-center justify-center rounded-bl-[100px] bg-white px-6 py-8 md:px-8 md:py-12 xl:px-10 xl:py-16 2xl:px-14">
          <div className="w-full max-w-[560px] xl:max-w-[650px]">
            <div className="flex flex-col gap-8 xl:gap-12 2xl:gap-14">
              <div className="flex flex-col items-center gap-5 xl:gap-7 2xl:gap-8">
                <img
                  src={logoImage}
                  alt="HRI logo"
                  className="h-[60px] w-auto object-contain xl:h-[82px] xl:w-[188px] 2xl:h-[99px] 2xl:w-[218px]"
                />
                <div className="space-y-2 text-center xl:space-y-3">
                  <h1 className="text-[32px] font-semibold text-[#1F2937] xl:text-[42px] 2xl:text-5xl">
                    Welcome Back
                  </h1>
                  <p className="text-base text-[#717579] xl:text-xl 2xl:text-2xl">
                    Please sign in to continue
                  </p>
                </div>
              </div>
              {desktopForm}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MOBILE ONLY — below md (<768px) ===================== */}
      <div
        className="flex h-full flex-col md:hidden"
      >
        {/* Hero Image — 40% of screen height */}
        <div
          className="relative w-full shrink-0 bg-gray-900 bg-cover bg-center bg-no-repeat"
          style={{ height: "40%", backgroundImage: `url(${heroImage})` }}
        >
        </div>

        {/* Form panel — exactly fills remaining 60%, overlaps image by 28px */}
        <div
          className="relative z-10 flex flex-col rounded-t-[32px] bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.10)]"
          style={{
            flex: "1 1 0",
            minHeight: 0,
            marginTop: "-28px",
            padding: "clamp(14px, 3vh, 24px) clamp(16px, 5vw, 32px) clamp(12px, 2.5vh, 20px)",
          }}
        >
          {/* Logo + Heading — compact, shrinks on small screens */}
          <div
            className="flex shrink-0 flex-col items-center"
            style={{ marginBottom: "clamp(8px, 2vh, 16px)" }}
          >
            <img
              src={logoImage}
              alt="HRI logo"
              className="w-auto object-contain"
              style={{
                height: "clamp(28px, 5.5vh, 44px)",
                marginBottom: "clamp(4px, 1vh, 8px)",
              }}
            />
            <h1
              className="text-center font-semibold text-[#1F2937]"
              style={{ fontSize: "clamp(20px, 5vw, 28px)" }}
            >
              Welcome Back
            </h1>
            <p
              className="mt-0.5 text-center text-[#717579]"
              style={{ fontSize: "clamp(10px, 2.5vw, 13px)" }}
            >
              Please sign in to continue
            </p>
          </div>

          {/* Form fills the rest — Login always at bottom */}
          <div className="flex min-h-0 flex-1 flex-col">
            {mobileForm}
          </div>
        </div>
      </div>

    </div>
  );
}

export default LoginScreen;