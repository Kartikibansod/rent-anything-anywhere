import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../components/ToastProvider.jsx";
import { OtpInput } from "../components/OtpInput.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { isAllowedEmail } from "../lib/emailValidation.js";
import { useUser } from "../lib/userContext.jsx";

const initialForm = { email: "", password: "" };

export function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login: setUser } = useUser();
  const [params] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [otp, setOtp] = useState("");
  const [otpState, setOtpState] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [googlePendingUser, setGooglePendingUser] = useState(null);
  const [authConfig, setAuthConfig] = useState({ googleConfigured: false });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    api.get("/auth/config")
      .then(({ data }) => setAuthConfig(data))
      .catch(() => setAuthConfig({ googleConfigured: false }));
  }, []);

  useEffect(() => {
    const token = params.get("token");
    const pendingGoogleUserId = params.get("userId");
    const googleOtpUserId = params.get("googleOtpUserId");
    const purpose = params.get("purpose") || "login_2fa";
    const googleError = params.get("error");
    if (pendingGoogleUserId) setGooglePendingUser({ _id: pendingGoogleUserId });
    if (googleOtpUserId) {
      setOtpState({ userId: googleOtpUserId, purpose });
      setCooldown(60);
      toast.success("OTP sent to your email for Google sign-in");
    }
    if (googleError === "google_email_not_verified") {
      toast.error("Google email is not verified/active");
    }
    if (token) {
      localStorage.setItem("token", token);
      api.get("/auth/me").then(({ data }) => {
        setUser(data.user);
        navigate("/");
      }).catch(() => {});
    }
  }, [params, navigate, setUser, toast]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function completeAuth(payload) {
    localStorage.setItem("token", payload.token);
    setUser(payload.user);
    toast.success("Logged in successfully");
    navigate("/");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!isAllowedEmail(form.email)) {
      setError("Please use a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", form);
      if (data.requiresOtp) {
        setOtpState(data);
        setCooldown(60);
        toast.success("OTP sent to your email");
      } else {
        await completeAuth(data);
      }
    } catch (err) {
      const message = getErrorMessage(err, "Login failed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(nextOtp = otp) {
    if (nextOtp.length !== 6) return;
    try {
      const { data } = await api.post("/auth/login/verify-otp", { userId: otpState.userId, otp: nextOtp });
      await completeAuth(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "OTP verification failed"));
    }
  }

  async function resendOtp() {
    if (cooldown > 0 || !otpState) return;
    await api.post("/auth/otp/resend", { userId: otpState.userId, purpose: otpState.purpose });
    setCooldown(60);
    toast.success("OTP resent");
  }

  async function continueGoogleLogin(userType) {
    if (!googlePendingUser) return;
    const { data } = await api.post("/auth/google/user-type", { userId: googlePendingUser._id, userType });
    if (data.requiresOtp) {
      setOtpState(data);
      setGooglePendingUser(null);
      setCooldown(60);
      toast.success("OTP sent to your email");
      return;
    }
    await completeAuth(data);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f2ef] px-5 py-10">
      <motion.section className="w-full max-w-md rounded-[32px] border border-stone-200 bg-white px-7 py-8 text-center shadow-[0_24px_80px_rgba(36,32,28,0.10)] sm:px-9" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,#111111,#8f7864)] text-2xl font-black text-white shadow-lg shadow-stone-200">R</div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-violet-500">WELCOME TO</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Rent Anything Anywhere</h1>
        <p className="mt-2 text-sm text-slate-500">Buy, sell and rent everything around your campus</p>
        <div className="mt-7 grid grid-cols-2 rounded-2xl bg-violet-50 p-1 text-sm font-bold">
          <button className="rounded-xl bg-white px-4 py-2 text-violet-700 shadow-sm" type="button">Login</button>
          <Link className="rounded-xl px-4 py-2 text-slate-500" to="/register">Register</Link>
        </div>

          {!otpState ? (
            <motion.form className="mt-7 space-y-4 text-left" onSubmit={handleSubmit}>
              {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" type="email" name="email" value={form.email} onChange={updateField} autoComplete="email" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <div className="relative mt-2">
                  <input className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={updateField} autoComplete="current-password" required />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </label>
              <button className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#111111_0%,#3a332d_100%)] text-base font-bold text-white shadow-lg shadow-stone-200" type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Sign In"}</button>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or continue with<span className="h-px flex-1 bg-slate-200" /></div>
              {authConfig.googleConfigured ? (
                <a className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 font-semibold text-slate-700" href={`${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001'}/api/auth/google`}>
                  <span className="text-lg font-black text-[#4285F4]">G</span> Continue with Google
                </a>
              ) : (
                <button className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 font-semibold text-slate-400" type="button" disabled title="Google Sign In not configured">
                  <span className="text-lg font-black">G</span> Continue with Google
                </button>
              )}
            </motion.form>
          ) : (
            <div className="mt-8 space-y-4 text-left">
              <p className="text-sm text-slate-600">Enter the 6-digit OTP sent to your email.</p>
              <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
              <button className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#111111_0%,#3a332d_100%)] font-bold text-white" type="button" onClick={() => verifyOtp()}>Verify OTP</button>
              <button className="w-full text-sm font-semibold text-indigo-700 disabled:text-slate-400" type="button" onClick={resendOtp} disabled={cooldown > 0}>Resend OTP {cooldown > 0 ? `in ${cooldown}s` : ""}</button>
            </div>
          )}
      </motion.section>

      {googlePendingUser ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6">
            <h3 className="text-xl font-black">Choose account type</h3>
            <p className="mt-1 text-sm text-slate-600">Required once for your first Google login.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="rounded-xl border px-3 py-2 font-semibold" onClick={() => continueGoogleLogin("student")}>Student</button>
              <button className="rounded-xl border px-3 py-2 font-semibold" onClick={() => continueGoogleLogin("local")}>Local</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
