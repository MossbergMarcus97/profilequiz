"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface PaywallProps {
  attemptId: string;
  priceLabel: string;
  bullets: string[];
}

export default function Paywall({ attemptId, priceLabel, bullets }: PaywallProps) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("results");

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      alert("Checkout failed: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-teal-900 text-white rounded-3xl p-8 md:p-12 space-y-8 relative overflow-hidden shadow-2xl shadow-teal-900/40">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-coral-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
      
      <div className="relative z-10 space-y-4">
        <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight">
          {t("getYourReport")}
        </h2>
        <p className="text-teal-100/80 text-lg max-w-xl">
          {t("detailedInsights")}
        </p>
      </div>

      <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center border-t border-white/10 pt-8">
        <ul className="space-y-4">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start space-x-3">
              <span className="bg-coral-500 rounded-full p-1 mt-1 text-[10px]">✓</span>
              <span className="text-sm font-medium">{bullet}</span>
            </li>
          ))}
          <li className="flex items-start space-x-3">
            <span className="bg-coral-500 rounded-full p-1 mt-1 text-[10px]">✓</span>
            <span className="text-sm font-medium">{t("instantAccess")}</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="bg-coral-500 rounded-full p-1 mt-1 text-[10px]">✓</span>
            <span className="text-sm font-medium">{t("downloadablePdf")}</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="bg-coral-500 rounded-full p-1 mt-1 text-[10px]">✓</span>
            <span className="text-sm font-medium">{t("moneyBackGuarantee")}</span>
          </li>
        </ul>

        <div className="flex flex-col items-center justify-center space-y-4 bg-white/5 rounded-2xl p-8 border border-white/10">
          <div className="text-center">
            <span className="text-teal-300 text-sm font-bold uppercase tracking-widest block mb-1">{t("oneTimePurchase")}</span>
            <span className="text-5xl font-serif font-bold">{priceLabel}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-coral-500 hover:bg-coral-600 text-white font-bold py-4 rounded-xl shadow-lg hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "..." : t("unlockFullReport")}
          </button>
          <p className="text-[10px] text-teal-100/40 uppercase tracking-widest font-bold">
            {t("securePayment")}
          </p>
        </div>
      </div>
    </div>
  );
}
