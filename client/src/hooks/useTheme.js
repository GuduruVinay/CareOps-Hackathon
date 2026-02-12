import { useState, useEffect } from "react";

export default function useTheme() {
  // Check local storage or default to 'light'
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove the old class and add the new one
    const oldTheme = theme === "dark" ? "light" : "dark";
    root.classList.remove(oldTheme);
    root.classList.add(theme);

    // Save to local storage
    localStorage.setItem("theme", theme);
  }, [theme]);

  return [theme, setTheme];
}