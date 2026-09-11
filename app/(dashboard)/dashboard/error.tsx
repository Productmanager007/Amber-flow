'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an external reporting service if you had one
    console.error("DASHBOARD ERROR BOUNDARY CAUGHT ERROR:", error);
  }, [error]);

  return (
    <div className="p-8 w-full">
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-red-900 max-w-4xl mx-auto shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-red-700 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Dashboard Render Error
        </h2>
        <p className="mb-4 text-sm font-medium">An error occurred while Next.js was rendering the Dashboard page. This error bypassed the try-catch block.</p>
        
        <div className="bg-white p-4 rounded-lg border border-red-100 font-mono text-sm overflow-auto mb-6">
          <p className="font-bold text-red-600 mb-2">{error.name}: {error.message}</p>
          <p className="text-slate-500 mb-2">Digest: {error.digest}</p>
          {error.stack && (
            <pre className="text-xs text-slate-700 whitespace-pre-wrap">{error.stack}</pre>
          )}
        </div>
        
        <button
          onClick={() => reset()}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
