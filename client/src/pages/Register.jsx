import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider.jsx";
import { OtpInput } from "../components/OtpInput.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { isAllowedEmail } from "../lib/emailValidation.js";
import { useUser } from "../lib/userContext.jsx";

const initialForm = { name: "", email: "", password: "", userType: "student", collegeName: "" };

export function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login: setUser } = useUser();
  const [form, setForm] = useState(initialForm);
  const [otp, setOtp] = useState("");
  const [otpState, setOtpState] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [collegeIdFile, setCollegeIdFile] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [authConfig, setAuthConfig] = useState({ googleConfigured: false });

  React.useEffect(() => {
    api.get("/auth/config").then(({ data }) => setAuthConfig(data)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!otpState) return;
    const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [otpState]);

  React.useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!isAllowedEmail(form.email)) {
      setError("Please use a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", form);
      if (data.token) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
        if (collegeIdFile && form.userType === "student") {
          const uploadBody = new FormData();
          uploadBody.append("collegeId", collegeIdFile);
          await api.post("/auth/student-verification", uploadBody);
        }
        toast.success("Account created");
        navigate("/");
        return;
      }
      setOtpState(data);
      setSecondsLeft(600);
      setCooldown(60);
      toast.success("OTP sent to your email");
    } catch (err) {
      const message = getErrorMessage(err, "Registration failed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(nextOtp = otp) {
    if (nextOtp.length !== 6) return;
    try {
      const { data } = await api.post("/auth/register/verify-otp", { userId: otpState.userId, otp: nextOtp });
      localStorage.setItem("token", data.token);
      setUser(data.user);
      if (collegeIdFile && form.userType === "student") {
        const uploadBody = new FormData();
        uploadBody.append("collegeId", collegeIdFile);
        await api.post("/auth/student-verification", uploadBody);
      }
      toast.success("Account verified and created");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err, "OTP verification failed"));
    }
  }

  async function resendOtp() {
    if (cooldown || !otpState) return;
    await api.post("/auth/otp/resend", { userId: otpState.userId, purpose: otpState.purpose });
    setCooldown(60);
    setSecondsLeft(600);
    toast.success("OTP resent");
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
            {["Verified students", "JWT protected", "No phone numbers"].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-8 sm:px-8">
        <motion.div className="w-full max-w-2xl bg-white px-6 py-7 sm:px-10 sm:py-10" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">CREATE ACCOUNT</p>
          <h2 className="mt-2 text-4xl font-black text-slate-950">Register</h2>
          <p className="mt-2 text-sm text-slate-600">Students and locals can join with email verification.</p>
      {!otpState ? (
        <motion.form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <label className="block"><span className="text-sm font-semibold text-slate-700">Name</span><input className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" type="text" name="name" value={form.name} onChange={updateField} required /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Email</span><input className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" type="email" name="email" value={form.email} onChange={updateField} required /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Your college name</span><input className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" type="text" name="collegeName" value={form.collegeName} onChange={updateField} placeholder="Optional" /></label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <div className="relative mt-2">
              <input className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={updateField} minLength={8} required />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </label>
          <div>
            <span className="text-sm font-medium text-slate-700">User type</span>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
              {[['student', 'Student'], ['local', 'Local']].map(([value, label]) => (
                <button key={value} className={`rounded px-3 py-2 text-sm font-semibold ${form.userType === value ? 'bg-white text-indigo-700' : 'text-slate-600'}`} type="button" onClick={() => setForm((c) => ({ ...c, userType: value }))}>{label}</button>
              ))}
            </div>
          </div>
          {form.userType === "student" ? (
            <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <span className="font-semibold">College ID upload</span>
              <input className="mt-2 block w-full text-sm" type="file" accept="image/*,.pdf" onChange={(event) => setCollegeIdFile(event.target.files?.[0] || null)} />
            </label>
          ) : null}
          <button className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#7C3AED_0%,#2563EB_100%)] text-base font-bold text-white" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Register"}</button>
          {authConfig.googleConfigured ? (
            <a className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 font-semibold text-slate-700" href={`${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001'}/api/auth/google`}>
              <span className="text-lg">G</span> Google Sign In
            </a>
          ) : (
            <button className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 font-semibold text-slate-400" type="button" disabled title="Google Sign In not configured">
              <span className="text-lg">G</span> Google Sign In
            </button>
          )}
          <p className="pt-2 text-sm text-slate-600">Already registered? <Link to="/login" className="font-semibold text-violet-700 hover:text-violet-800">Login</Link></p>
        </motion.form>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-slate-600">Enter the 6-digit OTP sent to your email.</p>
          <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
          <p className="text-center text-sm text-slate-500">Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p>
          <button className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#7C3AED_0%,#2563EB_100%)] font-bold text-white" type="button" onClick={() => verifyOtp()}>Verify OTP</button>
          <button className="w-full text-sm font-semibold text-indigo-700 disabled:text-slate-400" type="button" onClick={resendOtp} disabled={cooldown > 0}>Resend OTP {cooldown > 0 ? `in ${cooldown}s` : ""}</button>
        </div>
      )}
        </motion.div>
      </section>
    </div>
  );
}
