import React from "react";

export default function LoadingScreen({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center w-full h-full justify-center ">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
      <span className="text-lg font-medium text-gray-700 dark:text-gray-200">
        {message}
      </span>
    </div>
  );
}
