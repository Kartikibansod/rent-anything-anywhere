import React, { useEffect, useRef } from "react";

export function OtpInput({ value, onChange, onComplete }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  useEffect(() => {
    if (value.length === 6) onComplete?.(value);
  }, [value, onComplete]);

  function update(index, next) {
    const digit = next.replace(/\D/g, "").slice(-1);
    const chars = value.padEnd(6, " ").slice(0, 6).split("");
    chars[index] = digit || " ";
    onChange(chars.join("").replace(/\s/g, "").slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  return (
    <div className="grid grid-cols-6 gap-2">
      {digits.map((digit, index) => (
        <input
          aria-label={`OTP digit ${index + 1}`}
          className="h-14 rounded-2xl border border-slate-200 text-center text-xl font-black outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit.trim() && index > 0) refs.current[index - 1]?.focus();
          }}
          ref={(node) => { refs.current[index] = node; }}
          value={digit.trim()}
        />
      ))}
    </div>
  );
}
