import "../../styles/global.css";
import { useLayoutEffect, useState } from "react";

export default function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState("en");
  const [pathname, setPathname] = useState("/");
  const [isMounted, setIsMounted] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      setPathname(path);
      setCurrentLang(path.startsWith("/ru") ? "ru" : "en");
    }
    setIsMounted(true);
    setTimeout(() => setShowButton(true), 10);
  }, []);

  const switchLang = () => {
    if (typeof window === "undefined") return;
    let newPath = pathname;
    if (currentLang === "en") {
      newPath = "/ru" + (pathname === "/" ? "" : pathname);
    } else {
      newPath = pathname.replace(/^\/ru/, "") || "/";
    }
    window.location.href = newPath;
  };

  const nextLang = currentLang === "en" ? "Ru" : "En";

  return isMounted ? (
    <button
      className={`w-10 h-10 bg-orange-300 hover:bg-orange-400/80 dark:bg-zinc-600 dark:hover:bg-zinc-500 cursor-pointer text-zinc-900 dark:text-zinc-100 font-semibold rounded-md flex items-center justify-center transition-colors duration-500 fade-in-btn${showButton ? ' fade-in-btn--visible' : ''}`}
      onClick={switchLang}
      aria-label="Switch language"
      type="button"
    >
      {nextLang}
    </button>
  ) : (
    <div className="h-[40px] w-10" />
  );
}