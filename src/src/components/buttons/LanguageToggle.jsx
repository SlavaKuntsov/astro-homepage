"use client"
import "../../styles/global.css";
import { useLayoutEffect, useState } from "react";

export default function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState("en");
  const [pathname, setPathname] = useState("/");

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      setPathname(path);
      setCurrentLang(path.startsWith("/ru") ? "ru" : "en");
    }
  }, []);

  let newPath;
  if (currentLang === "en") {
    newPath = "/ru" + (pathname === "/" ? "" : pathname);
  } else {
    newPath = pathname.replace(/^\/ru/, "") || "/";
  }
  const nextLang = currentLang === "en" ? "Ru" : "En";

  return (
    <a
      className="w-10 h-10 bg-orange-300 hover:bg-orange-400/80 dark:bg-zinc-600 dark:hover:bg-zinc-500 cursor-pointer text-zinc-900 dark:text-zinc-100 font-semibold rounded-md flex items-center justify-center transition-colors duration-500"
      href={newPath}
      aria-label="Switch language"
      type="button"
      style={{ textDecoration: "none" }}
    >
      {nextLang}
    </a>
  );
}