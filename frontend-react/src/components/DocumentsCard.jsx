import React from 'react';

export default function DocumentsCard({ onClick }) {
  return (
    <button onClick={onClick} className="card card-hover text-left w-full">
      <div className="text-sm text-slate-500">Documents</div>
      <div className="mt-2 text-base text-slate-700">Company Documents</div>
    </button>
  );
}
