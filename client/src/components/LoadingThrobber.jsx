export default function LoadingThrobber() {
  return (
    // CHANGED: min-h-[50vh] -> min-h-screen to fill the whole window
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="w-12 h-12 rounded-full border-4 border-blue-200 dark:border-blue-900 opacity-50"></div>
        
        {/* Spinning Throbber */}
        <div className="absolute w-12 h-12 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        
        {/* Inner Pulse */}
        <div className="absolute w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
      </div>
      
      <p className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
        Loading Workspace...
      </p>
    </div>
  );
}