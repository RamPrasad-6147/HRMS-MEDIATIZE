import React from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

export default function AuthLoadingScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 transition-colors duration-300">
      <div className="flex flex-col items-center max-w-sm text-center space-y-4">
        {/* Brand Icon & Spinner Container */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-md">
          <ShieldCheck className="w-8 h-8" />
          <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow border border-gray-200 dark:border-gray-700">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Mediatize Tech HRMS
          </h2>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Restoring secure session...
          </p>
        </div>
      </div>
    </div>
  );
}
