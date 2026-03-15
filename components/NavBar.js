'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function useWindowWidth() {
  const [width, setWidth] = useState(1200)
  useEffect(() => {
    setWidth(window.innerWidth)
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

export default function NavBar() {
  const pathname = usePathname()
  const [dark, setDark] = useState(true)
  const w = useWindowWidth()
  const isMobile = w < 640

  useEffect(() => {
    const saved = localStorage.getItem('ncpa_theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    const theme = next ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ncpa_theme', theme)
  }

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      padding: isMobile ? '0 14px' : '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: isMobile ? 44 : 48,
      background: 'var(--base)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand — hide on very small screens to save space */}
      {!isMobile && (
        <span style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--muted)', userSelect: 'none' }}>
          NCPA · SOUND DEPT
        </span>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', height: '100%', marginLeft: isMobile ? 0 : 'auto', marginRight: isMobile ? 'auto' : 0 }}>
        {[
          { href: '/',       label: 'INVENTORY' },
          { href: '/manage', label: 'MANAGE'    },
        ].map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              padding: isMobile ? '0 16px' : '0 20px',
              fontSize: isMobile ? 10 : 11,
              fontWeight: active ? 600 : 400,
              letterSpacing: '0.12em',
              color: active ? 'var(--gold)' : 'var(--muted)',
              borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.15s',
              fontFamily: 'inherit',
            }}>
              {label}
            </Link>
          )
        })}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={dark ? 'Light mode' : 'Dark mode'}
        style={{
          background: 'none',
          border: '1px solid var(--border-hover)',
          color: 'var(--muted)',
          borderRadius: 4,
          padding: isMobile ? '5px 8px' : '4px 8px',
          fontSize: isMobile ? 14 : 13,
          lineHeight: 1,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border-hover)' }}
      >
        {dark ? '☀' : '☾'}
      </button>
    </nav>
  )
}
