"use client"
import type { Translation } from "@/types/Translation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../ui/dropdown-menu";
import { IoMenu, IoLogoGithub, IoSunny, IoMoon } from "react-icons/io5";
import LanguageToggle from "./language-toggle";

interface DropdownMenuDemoProps {
  t: Translation;
}

export function DropdownMenuDemo({ t }: DropdownMenuDemoProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="md:hidden flex w-10 h-10 bg-orange-300 hover:bg-orange-400/80 dark:bg-zinc-600 dark:hover:bg-zinc-500 cursor-pointer text-zinc-900 dark:text-zinc-100 font-semibold rounded-md items-center justify-center transition-colors duration-500"
        >
          <IoMenu className="text-[1.65rem]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 transition-colors duration-500" align="end">
        {/* <DropdownMenuLabel>Navigation</DropdownMenuLabel> */}
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <a href="/" className="block w-full h-full text-xl py-1 px-1">
              {t.nav.home}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/works" className="block w-full h-full text-xl py-1 px-1">
              {t.nav.works}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/arts" className="block w-full h-full text-xl py-1 px-1">
              {t.nav.arts}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="https://github.com/SlavaKuntsov/astro-homepage" className="flex flex-row items-center gap-2 w-full h-full text-xl py-1 px-1">
              <IoLogoGithub className="min-h-7 min-w-7" />
              {t.nav.source}
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <div className="flex flex-row gap-4 items-center justify-between px-1 py-0">
          {/* A plain button, not a React Theme island: the vanilla ThemeToggle
              script binds it through `data-theme-toggle` (ADR-0002/0003). This
              file is removed wholesale in #14. */}
          <button
            type="button"
            className="theme-toggle inline-flex cursor-pointer items-center justify-center rounded-3xl bg-orange-300 p-2 transition-colors duration-500 hover:bg-orange-400/80 dark:bg-zinc-600 dark:hover:bg-zinc-500"
            data-theme-toggle=""
            aria-label="Switch theme"
          >
            <IoSunny className="theme-toggle__sun" />
            <IoMoon className="theme-toggle__moon" />
          </button>
          <LanguageToggle />
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}