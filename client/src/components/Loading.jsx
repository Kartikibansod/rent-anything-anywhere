import React from "react";

export function Loading({ label = "Loading...", cards = 4, horizontal = false }) {
  const wrapper = horizontal
    ? "hide-scrollbar flex gap-5 overflow-x-auto pb-4"
    : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div>
      {label && <p className="mb-4 text-sm font-semibold text-slate-400 animate-pulse">{label}</p>}
      <div className={wrapper}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className={`overflow-hidden rounded-[28px] border border-slate-100 bg-white/80 shadow-md ${horizontal ? "w-80 shrink-0" : ""}`}
          >
            <div className="skeleton-shimmer aspect-[4/3] w-full" />
            <div className="space-y-3 p-4">
              <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
              <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
              <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
              <div className="mt-2 skeleton-shimmer h-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Loading;
