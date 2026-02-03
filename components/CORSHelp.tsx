
import React from 'react';
import { IconStorage } from './Icons';

interface CORSHelpProps {
  onRetry: () => void;
}

export const CORSHelp: React.FC<CORSHelpProps> = ({ onRetry }) => {
  const corsConfig = `[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <IconStorage className="w-32 h-32" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-sm">!</span>
          Connection Failed
        </h2>
        <p className="text-slate-400 mb-6 leading-relaxed">
          The application was unable to communicate with Cloudflare R2. This is usually caused by
          <span className="text-indigo-400 font-semibold"> CORS (Cross-Origin Resource Sharing)</span> rules
          blocking the browser request.
        </p>

        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider">How to fix this:</h3>
            <ol className="text-sm text-slate-400 space-y-4 list-decimal pl-4">
              <li>Log in to your <strong>Cloudflare Dashboard</strong>.</li>
              <li>Go to <strong>R2 &gt; Buckets &gt; aura-studio-exports</strong>.</li>
              <li>Select the <strong>Settings</strong> tab.</li>
              <li>Find <strong>CORS Policy</strong> and click "Edit CORS Policy".</li>
              <li>Paste the configuration below and save:</li>
            </ol>
          </div>

          <div className="relative group">
            <pre className="bg-slate-950 rounded-xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto border border-indigo-500/20">
              {corsConfig}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(corsConfig)}
              className="absolute top-2 right-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg"
            >
              COPY
            </button>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            Retry Connection
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
};
