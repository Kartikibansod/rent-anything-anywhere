import React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { useUser } from "../lib/userContext.jsx";

const initialForm = {
  name: "",
  email: "",
  password: "",
  userType: "student"
};

function scorePassword(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function generateStrongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login: setUser } = useUser();
  const [form, setForm] = useState(initialForm);
  const [collegeId, setCollegeId] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const strength = scorePassword(form.password);
  const strengthLabel = strength <= 1 ? "Weak" : strength <= 3 ? "Medium" : "Strong";

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function updateRole(userType) {
    setForm((current) => ({ ...current, userType }));
    if (userType !== "student") {
      setCollegeId(null);
    }
  }

  async function uploadCollegeId(token) {
    if (!collegeId) return;

    const body = new FormData();
    body.append("collegeId", collegeId);

    await api.post("/auth/student-verification", body, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await api.post("/auth/register", form);
      localStorage.setItem("token", data.token);
      setUser(data.user);
      await uploadCollegeId(data.token);
      toast.success("Account created successfully");
      navigate("/feed");
    } catch (err) {
      const message = getErrorMessage(err, "Registration failed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Start trading"
      title="Create account"
      subtitle="Students can verify with an academic email or college ID. Locals can join publicly."
      switchText="Already registered?"
      switchTo="/"
      switchLabel="Login"
    >
      <motion.form className="space-y-5" onSubmit={handleSubmit} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
        <ErrorMessage message={error} />

        {/* Google sign-up */}
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const { data } = await api.post("/auth/google", {
                  credential: credentialResponse.credential,
                  userType: form.userType
                });
                localStorage.setItem("token", data.token);
                setUser(data.user);
                toast.success(`Welcome, ${data.user.name.split(" ")[0]}!`);
                navigate("/feed");
              } catch (err) {
                setError(getErrorMessage(err, "Google sign-up failed"));
              }
            }}
            onError={() => setError("Google sign-up failed. Please try again.")}
            shape="pill"
            size="large"
            width="100%"
            text="signup_with"
            logo_alignment="left"
          />
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400">or register with email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <motion.label className="block" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            type="text"
            name="name"
            value={form.name}
            onChange={updateField}
            autoComplete="name"
            required
          />
        </motion.label>

        <motion.label className="block" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            type="email"
            name="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            required
          />
        </motion.label>

        <motion.label className="block" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
          <span className="text-sm font-medium text-slate-700">Password</span>
          <div className="relative mt-2">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 pr-12 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Password strength</span>
              <span className={`${strengthLabel === "Strong" ? "text-emerald-600" : strengthLabel === "Medium" ? "text-amber-600" : "text-red-600"} font-semibold`}>{strengthLabel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${strengthLabel === "Strong" ? "bg-emerald-500" : strengthLabel === "Medium" ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${Math.max(10, (strength / 4) * 100)}%` }}
              />
            </div>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
              onClick={() => setForm((current) => ({ ...current, password: generateStrongPassword() }))}
            >
              Suggest strong password
            </button>
          </div>
        </motion.label>

        <div>
          <span className="text-sm font-medium text-slate-700">User type</span>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
            {[
              ["student", "Student"],
              ["local", "Local"]
            ].map(([value, label]) => (
              <button
                className={`rounded px-3 py-2 text-sm font-semibold transition ${
                  form.userType === value
                    ? "bg-white text-leaf shadow-sm"
                    : "text-slate-600 hover:text-ink"
                }`}
                key={value}
                type="button"
                onClick={() => updateRole(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.userType === "student" ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">College ID</span>
            <input
              className="mt-2 w-full rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600 outline-none transition file:mr-3 file:rounded file:border-0 file:bg-leaf file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              type="file"
              accept="image/*"
              onChange={(event) => setCollegeId(event.target.files?.[0] || null)}
            />
          </label>
        ) : null}

        <motion.button
          className="brand-gradient w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition disabled:cursor-not-allowed disabled:bg-slate-400"
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </motion.button>
      </motion.form>
    </AuthLayout>
  );
}
