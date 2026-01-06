"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { locales, localeNames, localeFlags, Locale } from "@/i18n/config";

interface LanguageSelectorProps {
  currentLocale: Locale;
}

export default function LanguageSelector({ currentLocale }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocaleChange = async (locale: Locale) => {
    // Set cookie with unique name to avoid conflicts with other localhost projects
    document.cookie = `profilequiz_locale=${locale};path=/;max-age=31536000`;
    setIsOpen(false);
    // Force full page reload to ensure server reads new cookie value
    window.location.reload();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/80 hover:bg-white border border-gray-200 shadow-sm transition-colors"
        aria-label="Select language"
      >
        <span className="text-lg">{localeFlags[currentLocale]}</span>
        <span className="text-sm font-medium hidden sm:inline">{localeNames[currentLocale]}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors
                ${locale === currentLocale ? 'bg-teal-50 text-teal-700' : ''}`}
            >
              <span className="text-lg">{localeFlags[locale]}</span>
              <span className="text-sm font-medium">{localeNames[locale]}</span>
              {locale === currentLocale && (
                <svg className="w-4 h-4 ml-auto text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

