import React from "react";
import { Bell, ChevronDown, List, LogIn, LogOut, Menu, Shield, ShoppingBag, User, UserPlus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { closeSocket } from "../lib/socket.js";
import { useUser } from "../lib/userContext.jsx";
import { api } from "../lib/api.js";
import { getFirstName, getInitials } from "../lib/display.js";

const centerLinks = [
  ["/buy", "BUY"],
  ["/rent", "RENT"],
  ["/create", "SELL"]
];
const mobileLinks = [
  ["/", "Feed", ShoppingBag],
  ["/create", "Create", List],
  ["/chat", "Chat", Shield]
];

const profileLinks = [
  ["/my-listings", "My Listings", List],
  ["/my-deals", "My Deals", ShoppingBag],
  ["/wishlist", "Wishlist", ShoppingBag],
  ["/bookings", "Bookings", List],
  ["/chat", "Chat", Shield],
  ["/admin", "Admin", Shield]
];

function capitalizeName(name = "") {
  const first = getFirstName(name).toLowerCase();
  return first ? `${first.charAt(0).toUpperCase()}${first.slice(1)}` : "User";
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  function linkIsActive(to) {
    if (to === "/") return location.pathname === "/";
    if (to === "/create") return location.pathname === "/create";
    if (to === "/chat") return location.pathname.startsWith("/chat");
    if (to === "/profile") return location.pathname.startsWith("/profile");
    if (to === "/admin") return location.pathname === "/admin";
    if (to === "/my-listings" || to === "/wishlist" || to === "/my-deals" || to === "/bookings") return location.pathname === to;
    return false;
  }

  useEffect(() => {
    function loadUnread() {
      api.get("/notifications")
        .then(({ data }) => setUnreadCount(data.unread || 0))
        .catch(() => setUnreadCount(0));
    }
    loadUnread();
    const timer = setInterval(loadUnread, 30000);
    return () => clearInterval(timer);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    closeSocket();
    navigate("/login");
  }

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-3 py-3">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2">
          <div className="z-10 flex min-w-0 shrink-0 items-center gap-3">
            <NavLink to="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight" aria-label="Rent Anything Anywhere home">
              <span className="brand-gradient grid h-9 w-9 place-items-center rounded-full text-white shadow-lg shadow-indigo-500/25">R</span>
            </NavLink>
            {user ? <span className="hidden whitespace-nowrap text-[18px] font-bold text-[#7c3aed] md:inline-block">Hey {capitalizeName(user.name)}!</span> : null}
          </div>
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-full bg-white/55 p-1 lg:flex">
            {centerLinks.map(([to, label]) => (
              <Link
                key={to}
                to={to === "/profile" ? `/profile/${user?._id}` : to}
                className={`relative rounded-full border px-5 py-2 text-sm font-black transition ${
                  linkIsActive(to)
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-300/40"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="z-10 flex min-w-0 items-center justify-end gap-2">
            {user ? (
              <>
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
              </>
            ) : null}
            {user ? (
            <div className="relative hidden lg:block">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                onClick={() => setProfileOpen((value) => !value)}
                type="button"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {user?.name ? getInitials(user.name) : "U"}
                </span>
                {user?.name || "Profile"}
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
                    {profileLinks.filter(([to]) => to !== "/admin" || user?.role === "admin").map(([to, label, Icon]) => (
                      <NavLink
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                        key={to}
                        onClick={() => setProfileOpen(false)}
                        to={to === "/profile" ? `/profile/${user?._id}` : to}
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
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700" to="/login"><LogIn size={16} /> Login</Link>
                <Link className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white" to="/register"><UserPlus size={16} /> Register</Link>
              </div>
            )}
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
              {[...centerLinks, ...profileLinks.filter(([to]) => to !== "/admin" || user?.role === "admin")].map(([to, label, Icon]) => (
                <NavLink
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-white ${
                    linkIsActive(to) ? "bg-violet-100 text-violet-700" : "text-slate-700"
                  }`}
                  key={to}
                  to={to === "/profile" ? `/profile/${user?._id}` : to}
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
        {[...mobileLinks, ["/notifications", "Alerts", Bell], [`/profile/${user?._id}`, "Profile", User]].map(([to, label, Icon]) => (
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
