import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useUser } from "../lib/userContext.jsx";

export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useUser();
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    localStorage.setItem("token", token);
    api.get("/auth/me")
      .then(({ data }) => {
        login(data.user);
        if (params.get("newUser") === "1" || data.user?.googleOnboardingPending) {
          setPendingUser(data.user);
          return;
        }
        navigate("/", { replace: true });
      })
      .catch(() => navigate("/login", { replace: true }));
  }, [params, navigate, login]);

  async function chooseType(userType) {
    const { data } = await api.post("/auth/google/user-type", { userId: pendingUser._id, userType });
    localStorage.setItem("token", data.token);
    login(data.user);
    navigate("/", { replace: true });
  }

  if (pendingUser) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <h1 className="text-xl font-black">Choose account type</h1>
          <p className="mt-1 text-sm text-slate-600">Required once for your first Google sign-in.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="rounded-2xl border px-4 py-3 font-bold" type="button" onClick={() => chooseType("student")}>Student</button>
            <button className="rounded-2xl border px-4 py-3 font-bold" type="button" onClick={() => chooseType("local")}>Local</button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="grid min-h-screen place-items-center text-sm font-semibold text-slate-500">Signing you in...</div>;
}
