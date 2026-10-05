import { createContext, useContext, useEffect, useState } from "react";
import { storage } from "../services/storage";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => storage.getTheme());

  useEffect(() => {
    storage.setTheme(theme);
    const body = document.body;
    const html = document.documentElement;

    if (theme === "dark") {
      body.classList.add("dark");
      body.setAttribute("data-bs-theme", "dark");
      html.setAttribute("data-bs-theme", "dark");
    } else {
      body.classList.remove("dark");
      body.setAttribute("data-bs-theme", "light");
      html.setAttribute("data-bs-theme", "light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
