import React from 'react';

export default function StatCard({ title, value, ctaText, onCta, onClick }) {
  return (
    <button onClick={onClick} className="card text-left w-full hover:shadow transition">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {onCta && (
        <div className="mt-4">
          <span
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              onCta();
            }}
          >
            {ctaText || 'Add Data'}
          </span>
        </div>
      )}
    </button>
  );
}
