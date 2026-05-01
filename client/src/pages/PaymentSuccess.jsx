import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

export function PaymentSuccess() {
  const toast = useToast();
  const transactionId = localStorage.getItem("lastTransactionId");

  async function confirmReceipt() {
    if (!transactionId) {
      toast.error("No recent online payment found");
      return;
    }
    try {
      await api.post("/payments/capture", { transactionId });
      toast.success("Receipt confirmed. Escrow released.");
      localStorage.removeItem("lastTransactionId");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not release escrow"));
    }
  }

  return (
    <section className="mx-auto grid max-w-xl place-items-center rounded-[36px] bg-white p-10 text-center shadow-xl">
      <CheckCircle2 className="animate-bounce text-emerald-600" size={76} />
      <h1 className="mt-5 text-3xl font-black text-slate-950">Payment Successful!</h1>
      <p className="mt-2 text-slate-600">Payment is held safely. Confirm receipt after you get the item.</p>
      <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
        Order details and escrow status are available in My Deals.
      </div>
      <button className="mt-6 rounded-full bg-emerald-600 px-6 py-3 font-bold text-white" type="button" onClick={confirmReceipt}>
        I received the item
      </button>
      <Link className="mt-3 rounded-full bg-slate-950 px-6 py-3 font-bold text-white" to="/">
        Continue Shopping
      </Link>
    </section>
  );
}
