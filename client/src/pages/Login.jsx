import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";
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
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        navigate("/feed");
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
    navigate("/feed");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
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

  async function verifyOtp() {
    try {
      const { data } = await api.post("/auth/login/verify-otp", { userId: otpState.userId, otp });
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
    await completeAuth(data);
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[48%_52%]">
      <section className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#7C3AED_0%,#2563EB_100%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <span className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-xs font-black tracking-[0.16em]">HOSTEL-FIRST MARKETPLACE</span>
            <h1 className="mt-8 text-5xl font-black leading-tight">Trade safely with students and trusted nearby locals</h1>
            <p className="mt-5 max-w-xl text-lg text-white/90">Buy, sell, rent, chat, and arrange handoffs without sharing phone numbers</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['Verified students', 'JWT protected', 'No phone numbers'].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-8 sm:px-8">
        <motion.div className="w-full max-w-2xl bg-white px-6 py-7 sm:px-10 sm:py-10" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="mt-2 text-4xl font-black text-slate-950">Login</h2>
          <p className="mt-2 text-sm text-slate-600">Access your listings, chats, deals, and verification status.</p>

          {!otpState ? (
            <motion.form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
              <button className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#7C3AED_0%,#2563EB_100%)] text-base font-bold text-white" type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Login"}</button>
              <a className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 font-semibold text-slate-700" href={`${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001'}/api/auth/google`}>
                <span className="text-lg">G</span> Google Sign In
              </a>
              <p className="pt-2 text-sm text-slate-600">New here? <Link to="/register" className="font-semibold text-violet-700 hover:text-violet-800">Create an account</Link></p>
            </motion.form>
          ) : (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-slate-600">Enter the 6-digit OTP sent to your email.</p>
              <input className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-center text-2xl tracking-[0.45em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="------" />
              <button className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#7C3AED_0%,#2563EB_100%)] font-bold text-white" type="button" onClick={verifyOtp}>Verify OTP</button>
              <button className="w-full text-sm font-semibold text-indigo-700 disabled:text-slate-400" type="button" onClick={resendOtp} disabled={cooldown > 0}>Resend OTP {cooldown > 0 ? `in ${cooldown}s` : ""}</button>
            </div>
          )}
        </motion.div>
      </section>

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
