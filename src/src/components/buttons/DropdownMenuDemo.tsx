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
import { IoMenu, IoLogoGithub } from "react-icons/io5";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

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

      <DropdownMenuContent className="w-72" align="end">
        {/* <DropdownMenuLabel>Navigation</DropdownMenuLabel> */}
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <a href="/" className="block w-full h-full text-xl py-1 px-1">
              {t.header.links[0]}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/works" className="block w-full h-full text-xl py-1 px-1">
              {t.header.links[1]}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/about" className="block w-full h-full text-xl py-1 px-1">
              {t.header.links[2]}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="https://github.com/SlavaKuntsov/astro-homepage" className="flex flex-row items-center gap-2 w-full h-full text-xl py-1 px-1">
              <IoLogoGithub className="min-h-7 min-w-7" /> 
              {t.header.links[3]}
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <div className="flex flex-row gap-4 items-center justify-between px-1 py-0">
          <ThemeToggle />
          <LanguageToggle />
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}