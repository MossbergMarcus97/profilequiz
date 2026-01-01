"use client";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="bg-teal-700 text-white px-4 py-2 rounded-lg font-bold"
    >
      Download / Print PDF
    </button>
  );
}


