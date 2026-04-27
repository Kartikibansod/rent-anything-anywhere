import React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { useUser } from "../lib/userContext.jsx";

const initialForm = {
  email: "",
  password: ""
};

export function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login: setUser } = useUser();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      toast.success("Logged in successfully");
      setUser(data.user);
      navigate("/feed");
    } catch (err) {
      const message = getErrorMessage(err, "Login failed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[45%_55%]">
      <section className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#7c3aed_0%,#2563eb_100%)]" />
        <div className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="flex w-full max-w-xl -translate-y-[10%] flex-col">
            <div className="flex items-center gap-3 text-lg font-black">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-white">R</span>
            Rent Anything Anywhere
            </div>
            <div className="mt-10 max-w-xl">
              <h1 className="mt-8 text-5xl font-black leading-tight text-white">
                Trade safely with students and trusted nearby locals.
              </h1>
              <p className="mt-5 text-lg text-white/85">
                Buy, sell, rent, chat, and arrange handoffs without sharing phone numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-8 sm:px-8">
        <motion.div
          className="w-full max-w-2xl bg-white px-6 py-7 sm:px-10 sm:py-10"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-black tracking-wide text-emerald-600">WELCOME BACK</p>
          <h2 className="mt-2 text-4xl font-black text-slate-950">Login</h2>
          <p className="mt-2 text-sm text-slate-600">Access your listings, chats, deals, and verification status.</p>

          <motion.form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <ErrorMessage message={error} />

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <div className="relative mt-2">
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-base outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={updateField}
                  autoComplete="current-password"
                  required
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <motion.button
              className="brand-gradient h-14 w-full rounded-2xl text-base font-bold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </motion.button>

            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  const { data } = await api.post("/auth/google", { credential: credentialResponse.credential, userType: "local" });
                  localStorage.setItem("token", data.token);
                  setUser(data.user);
                  toast.success("Logged in with Google");
                  navigate("/feed");
                } catch (err) {
                  toast.error(getErrorMessage(err, "Google login failed"));
                }
              }}
              onError={() => toast.error("Google login failed")}
              shape="rectangular"
              size="large"
              width="100%"
              text="signin_with"
              theme="outline"
              logo_alignment="left"
            />

            <p className="pt-2 text-sm text-slate-600">
              New here?{" "}
              <Link to="/register" className="font-semibold text-violet-700 hover:text-violet-800">
                Create an account
              </Link>
            </p>
          </motion.form>
        </motion.div>
      </section>
    </div>
  );
}
