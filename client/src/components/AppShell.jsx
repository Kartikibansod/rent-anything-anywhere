import React from "react";
import { Bell, ChevronDown, List, LogOut, Menu, Shield, ShoppingBag, User, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { closeSocket } from "../lib/socket.js";
import { useUser } from "../lib/userContext.jsx";
import { api } from "../lib/api.js";
import { getFirstName, getInitials } from "../lib/display.js";

const centerLinks = [
  ["/search?type=sell", "Buy"],
  ["/search?type=rent", "Rent"],
  ["/create", "Sell"]
];
const mobileLinks = [
  ["/search?type=sell", "Buy", ShoppingBag],
  ["/search?type=rent", "Rent", List],
  ["/create", "Sell", Shield]
];

const profileLinks = [
  ["/my-listings", "My Listings", List],
  ["/my-deals", "My Deals", ShoppingBag],
  ["/wishlist", "Wishlist", User],
  ["/bookings", "Bookings", Bell],
  ["/admin", "Admin", Shield]
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  function linkIsActive(to) {
    if (to === "/create") return location.pathname === "/create";
    if (to === "/search?type=sell") {
      return location.pathname === "/search" && new URLSearchParams(location.search).get("type") === "sell";
    }
    if (to === "/search?type=rent") {
      return location.pathname === "/search" && new URLSearchParams(location.search).get("type") === "rent";
    }
    return false;
  }

  useEffect(() => {
    api.get("/notifications")
      .then(({ data }) => setUnreadCount(data.unread || 0))
      .catch(() => setUnreadCount(0));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    closeSocket();
    navigate("/");
  }

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-40 px-3 py-4">
        <div className="glass mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full px-5 py-3.5">
          <NavLink to="/feed" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="brand-gradient grid h-9 w-9 place-items-center rounded-full text-white shadow-lg shadow-indigo-500/25">R</span>
            {user?.name ? <span className="hidden text-lg font-black text-slate-800 md:inline">Hi {getFirstName(user.name)} 👋</span> : null}
          </NavLink>
          <nav className="hidden items-center gap-1.5 lg:flex">
            {centerLinks.map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className={`relative rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  to.includes("type=sell")
                    ? linkIsActive(to)
                      ? "border-emerald-600 bg-emerald-500 text-white shadow-lg shadow-emerald-300/40"
                      : "border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-50"
                    : to.includes("type=rent")
                      ? linkIsActive(to)
                        ? "border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-300/40"
                        : "border-violet-500 bg-white text-violet-600 hover:bg-violet-50"
                      : linkIsActive(to)
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-300/40"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="relative hidden rounded-full border border-slate-200 bg-white/70 p-2.5 text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 lg:inline-flex"
              onClick={() => navigate("/notifications")}
              type="button"
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
            <div className="relative hidden lg:block">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                onClick={() => setProfileOpen((value) => !value)}
                type="button"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {user?.name ? getInitials(user.name) : "U"}
                </span>
                Profile
                <ChevronDown size={16} />
              </button>
              <AnimatePresence>
                {profileOpen ? (
                  <motion.div
                    className="glass absolute right-0 z-50 mt-2 w-52 rounded-2xl p-2"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {profileLinks.map(([to, label, Icon]) => (
                      <NavLink
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                        key={to}
                        onClick={() => setProfileOpen(false)}
                        to={to}
                      >
                        <Icon size={15} />
                        {label}
                      </NavLink>
                    ))}
                    <button
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-white"
                      onClick={logout}
                      type="button"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <button className="rounded-full border border-slate-200 bg-white/70 p-2 lg:hidden" onClick={() => setOpen(!open)} type="button">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open ? (
            <motion.nav
              className="glass mx-auto mt-3 grid max-w-7xl gap-2 rounded-[28px] p-3 lg:hidden"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {[...centerLinks, ...profileLinks].map(([to, label, Icon]) => (
                <NavLink
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-white ${
                    linkIsActive(to) ? "bg-violet-100 text-violet-700" : "text-slate-700"
                  }`}
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                >
                  {Icon ? <Icon size={18} /> : null}
                  {label}
                </NavLink>
              ))}
              <button className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-white" onClick={logout}>
                <LogOut size={18} />
                Logout
              </button>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-5">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Outlet />
        </motion.div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/70 bg-white/80 backdrop-blur lg:hidden">
        {[...mobileLinks, ["/notifications", "Alerts", Bell], ["/profile/me", "Profile", User]].map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 text-xs ${isActive ? "text-leaf" : "text-slate-500"}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
