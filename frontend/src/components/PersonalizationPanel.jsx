import React from "react";

export default function PersonalizationPanel({ personalizationApplied = [] }) {
  if (!personalizationApplied || personalizationApplied.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-blue-600">playlist_add_check</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
          Personalization Rules Applied
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {personalizationApplied.map((item, index) => {
          // Prettify the string if it contains colons or underscores but preserve original text content
          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 hover:border-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-emerald-500 text-lg select-none shrink-0 mt-0.5">
                check_circle
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Adjustment Rule #{index + 1}
                </span>
                <span className="text-sm text-slate-700 font-medium leading-relaxed break-words">
                  {item}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
