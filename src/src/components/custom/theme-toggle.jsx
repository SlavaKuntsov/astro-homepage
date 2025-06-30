"use client"
import "../../styles/global.css";
import { useLayoutEffect, useState } from 'react'
import { IoSunny } from "react-icons/io5";
import { IoMoon } from "react-icons/io5";

const themes = ['light', 'dark']

export default function ThemeToggle() {
    const [isMounted, setIsMounted] = useState(false)
    const [showButton, setShowButton] = useState(false)
    const [theme, setTheme] = useState(() => {
        if (import.meta.env.SSR) {
            return undefined
        }
        if (
            typeof localStorage !== 'undefined' &&
            localStorage.getItem('theme')
        ) {
            return localStorage.getItem('theme')
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark'
        }
        return 'light'
    })

    const toggleTheme = () => {
        const t = theme === 'light' ? 'dark' : 'light'
        localStorage.setItem('theme', t)
        setTheme(t)
    }

    useLayoutEffect(() => {
        const root = document.documentElement
        if (theme === 'light') {
            root.classList.remove('dark')
        } else {
            root.classList.add('dark')
        }
    }, [theme])

    useLayoutEffect(() => {
        setIsMounted(true)
        setTimeout(() => setShowButton(true), 10)
    }, [])

    return isMounted ? (
        <div className='inline-flex items-center p-[1px] rounded-3xl bg-orange-300 dark:bg-zinc-600 hover:bg-orange-400/80 dark:hover:bg-zinc-500 transition-colors duration-500'>
            {themes.map(t => {
                const checked = t === theme
                return (
                    <button
                        className={`${checked ? 'bg-white text-zinc-900' : ''} cursor-pointer rounded-3xl p-2 flex items-center justify-center fade-in-btn${showButton ? ' fade-in-btn--visible' : ''}`}
                        onClick={toggleTheme}
                        aria-label={`Switch to ${t} mode`}
                        key={t}
                        style={{ position: 'relative' }}
                    >
                        {t === 'light' ?
                            <IoSunny />
                            :
                            <IoMoon />
                        }
                    </button>
                )
            })}
        </div>
    ) : (
        <div className='h-[26px]' />
    )
}