import { useState } from "react";
import { Lock, Phone } from "lucide-react";
import logoImage from "../../../assets/logo.png";
import heroImage from "../../../assets/Subtract.png";

function LoginScreen({ onLogin }) {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (role === "admin") {
      onLogin("admin", {
        id: "1",
        name: "Admin User",
        role: "admin",
        mobile: mobile || "1234567890",
      });
      return;
    }

    onLogin("supervisor", {
      id: "2",
      name: "John Supervisor",
      role: "supervisor",
      mobile: mobile || "0987654321",
      assignedSite: "Downtown Plaza",
    });
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 xl:space-y-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#717579] sm:text-base">
          Role
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F5F6F8] p-1 sm:gap-3 sm:p-1.5">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:rounded-2xl sm:py-3"
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
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:rounded-2xl sm:py-3"
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
        <label className="mb-2 block text-sm font-semibold text-[#717579] md:text-base">
          Mobile
        </label>
        <div className="flex h-[48px] items-center gap-3 rounded-xl border border-[#DFE0E2] bg-[#F9FAFC] px-4 sm:h-[56px] md:h-[62px] xl:h-[70px] md:rounded-2xl md:px-5">
          <Phone className="h-4 w-4 text-[#F09E39] md:h-5 md:w-5" />
          <input
            type="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="Enter Your Mobile No"
            className="w-full border-0 bg-transparent p-0 text-sm text-[#1F2937] placeholder:text-[#A5A3A3] focus:outline-none focus:ring-0 md:text-base"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#717579] md:text-base">
          Password<span className="text-[#EC3F3F]">*</span>
        </label>
        <div className="flex h-[48px] items-center gap-3 rounded-xl border border-[#DFE0E2] bg-[#F9FAFC] px-4 sm:h-[56px] md:h-[62px] xl:h-[70px] md:rounded-2xl md:px-5">
          <Lock className="h-4 w-4 text-[#F09E39] md:h-5 md:w-5" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            className="w-full border-0 bg-transparent p-0 text-sm text-[#1F2937] placeholder:text-[#A5A3A3] focus:outline-none focus:ring-0 md:text-base"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-[#414651] sm:text-sm md:text-base">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-[#A5A3A3] sm:h-4 sm:w-4"
          />
          <span>Remember me</span>
        </label>
        <button type="button" className="font-semibold text-[#1F2937]">
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        className="mt-6 h-[48px] w-full rounded-[10px] text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:mt-8 sm:h-[56px] md:h-[62px] xl:mt-10 xl:h-[70px] md:text-lg xl:text-xl"
        style={{ backgroundColor: "#F09E39" }}
      >
        Login
      </button>
    </form>
  );

  return (
    <div className="min-h-screen overflow-hidden bg-white">

      {/* ===================== DESKTOP LAYOUT (xl+) ===================== */}
      <div className="hidden h-screen xl:flex">

        {/* Left — Hero Image: fills full height, no gap */}
        <div className="relative h-screen flex-1 overflow-hidden rounded-tr-[100px]">
          <img
            src={heroImage}
            alt="Construction site"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>

        {/* Right — Login Form */}
        <div className="flex h-screen w-[min(44%,834px)] min-w-[620px] items-center justify-center rounded-bl-[100px] bg-white px-10 py-16 2xl:px-14">
          <div className="w-full max-w-[650px] px-6 py-8 2xl:px-8">
            <div className="flex flex-col gap-12 2xl:gap-14">
              <div className="flex flex-col items-center gap-7 2xl:gap-8">
                <img
                  src={logoImage}
                  alt="HRI logo"
                  className="h-[82px] w-[188px] object-contain 2xl:h-[99px] 2xl:w-[218px]"
                />
                <div className="space-y-3 text-center">
                  <h1 className="text-[42px] font-semibold text-[#1F2937] 2xl:text-5xl">
                    Welcome Back
                  </h1>
                  <p className="text-xl text-[#717579] 2xl:text-2xl">
                    Please sign in to continue
                  </p>
                </div>
              </div>
              {formContent}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MOBILE / TABLET LAYOUT (below xl) ===================== */}
      <div className="flex min-h-screen flex-col bg-white xl:hidden">

        {/* Hero Image — full bleed, no border, no rounded corners at top */}
        <div className="relative w-full overflow-hidden"
          style={{ height: "clamp(240px, 40vw, 420px)" }}
        >
          <img
            src={heroImage}
            alt="Construction site"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>

        {/* Form Card — slides up over image with rounded top */}
        <div className="relative z-10 -mt-7 flex flex-1 flex-col rounded-t-[32px] bg-white px-5 pb-8 pt-6 shadow-[0_-8px_24px_rgba(0,0,0,0.10)] sm:px-8 sm:pb-10 sm:pt-8 md:mx-auto md:w-full md:max-w-[680px] md:px-12 md:pb-12 md:pt-10">

          {/* Logo + Heading */}
          <div className="mb-6 flex flex-col items-center sm:mb-7 md:mb-8">
            <img
              src={logoImage}
              alt="HRI logo"
              className="mb-3 h-10 w-auto object-contain sm:h-12 md:h-[60px]"
            />
            <h1 className="text-center text-[28px] font-semibold text-[#1F2937] sm:text-[32px] md:text-[38px]">
              Welcome Back
            </h1>
            <p className="mt-1 text-center text-sm text-[#717579] sm:text-base md:text-lg">
              Please sign in to continue
            </p>
          </div>

          {/* Form */}
          <div className="w-full md:mx-auto md:max-w-[520px]">
            {formContent}
          </div>
        </div>
      </div>

    </div>
  );
}

export default LoginScreen;