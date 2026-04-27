import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function AuthLayout({ children, eyebrow, title, subtitle, switchText, switchTo, switchLabel }) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="brand-gradient relative flex flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 lg:rounded-r-[48px] lg:px-12">
          <motion.div
            className="absolute inset-0 opacity-40"
            animate={{ scale: [1, 1.08, 1], rotate: [0, 3, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
            style={{
              background:
                "radial-gradient(circle at 20% 25%, white 0, transparent 22%), radial-gradient(circle at 80% 70%, #67e8f9 0, transparent 24%)"
            }}
          />
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Rent Anything Anywhere
          </Link>

          <motion.div className="relative py-16" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-saffron">
              Hostel-first marketplace
            </p>
            <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight sm:text-5xl">
              Trade safely with students and trusted nearby locals.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/75">
              Buy and rent, chat, and arrange handoffs without sharing phone numbers.
            </p>
          </motion.div>

          <div className="grid gap-3 text-sm text-white/75 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <span>Verified students</span>
            <span>JWT protected</span>
            <span>No phone numbers</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <motion.div className="w-full max-w-md" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-leaf">{eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>

            <div className="glass mt-8 rounded-[32px] p-5 sm:p-6">
              {children}
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              {switchText}{" "}
              <Link to={switchTo} className="font-semibold text-leaf hover:text-ink">
                {switchLabel}
              </Link>
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
