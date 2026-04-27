import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { useUser } from "../lib/userContext.jsx";

const initialForm = { name: "", email: "", password: "", userType: "student" };

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

  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setOtpState(data);
      toast.success("OTP sent to your email");
    } catch (err) {
      const message = getErrorMessage(err, "Registration failed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp() {
    try {
      const { data } = await api.post("/auth/register/verify-otp", { userId: otpState.userId, otp });
      localStorage.setItem("token", data.token);
      setUser(data.user);
      toast.success("Account verified and created");
      navigate("/feed");
    } catch (err) {
      toast.error(getErrorMessage(err, "OTP verification failed"));
    }
  }

  return (
    <AuthLayout eyebrow="Start trading" title="Create account" subtitle="Students and locals can join with email verification" switchText="Already registered?" switchTo="/" switchLabel="Login">
      {!otpState ? (
        <motion.form className="space-y-5" onSubmit={handleSubmit}>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <label className="block"><span className="text-sm font-medium text-slate-700">Name</span><input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm" type="text" name="name" value={form.name} onChange={updateField} required /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Email</span><input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm" type="email" name="email" value={form.email} onChange={updateField} required /></label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <div className="relative mt-2">
              <input className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 pr-12 text-sm" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={updateField} minLength={8} required />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
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
          <button className="brand-gradient w-full rounded-2xl px-4 py-3 text-sm font-bold text-white" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Register"}</button>
        </motion.form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Enter the 6-digit OTP sent to your email.</p>
          <input className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-center text-2xl tracking-[0.45em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="------" />
          <button className="brand-gradient h-14 w-full rounded-2xl font-bold text-white" type="button" onClick={verifyOtp}>Verify OTP</button>
        </div>
      )}
    </AuthLayout>
  );
}
