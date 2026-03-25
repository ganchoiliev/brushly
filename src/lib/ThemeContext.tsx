'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export interface Palette {
  name: string
  bg: string
  accent: string
  text: string
  textMuted: string
  textLabel: string
  swatch: string
  swatchBorder: string
  btnBg: string
  btnText: string
  dark: boolean
}

export const PALETTES: Palette[] = [
  {
    name: 'Classic Cream',
    bg: '#F5F0EB',
    accent: '#C8A96E',
    text: '#1A1A1A',
    textMuted: 'rgba(26,26,26,0.5)',
    textLabel: 'rgba(26,26,26,0.35)',
    swatch: '#F5F0EB',
    swatchBorder: 'rgba(26,26,26,0.15)',
    btnBg: '#1A1A1A',
    btnText: '#F5F0EB',
    dark: false,
  },
  {
    name: 'Sage Green',
    bg: '#4A5D4A',
    accent: '#D4BC8B',
    text: '#F5F0EB',
    textMuted: 'rgba(245,240,235,0.6)',
    textLabel: 'rgba(245,240,235,0.35)',
    swatch: '#8B9D77',
    swatchBorder: 'none',
    btnBg: '#F5F0EB',
    btnText: '#1A1A1A',
    dark: true,
  },
  {
    name: 'Navy Depth',
    bg: '#1E2D3D',
    accent: '#C8A96E',
    text: '#F5F0EB',
    textMuted: 'rgba(245,240,235,0.55)',
    textLabel: 'rgba(245,240,235,0.3)',
    swatch: '#2C3E50',
    swatchBorder: 'none',
    btnBg: '#C8A96E',
    btnText: '#1A1A1A',
    dark: true,
  },
  {
    name: 'Warm Charcoal',
    bg: '#2D2A26',
    accent: '#C8A96E',
    text: '#F5F0EB',
    textMuted: 'rgba(245,240,235,0.5)',
    textLabel: 'rgba(245,240,235,0.3)',
    swatch: '#2D2D2D',
    swatchBorder: 'none',
    btnBg: '#C8A96E',
    btnText: '#1A1A1A',
    dark: true,
  },
  {
    name: 'Blush Pink',
    bg: '#E8D5CC',
    accent: '#A68B5B',
    text: '#2D2A26',
    textMuted: 'rgba(45,42,38,0.5)',
    textLabel: 'rgba(45,42,38,0.35)',
    swatch: '#D4B5A7',
    swatchBorder: 'rgba(26,26,26,0.1)',
    btnBg: '#2D2A26',
    btnText: '#F5F0EB',
    dark: false,
  },
]

interface ThemeContextValue {
  activePalette: number
  palette: Palette
  setActivePalette: (i: number) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  activePalette: 0,
  palette: PALETTES[0],
  setActivePalette: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [activePalette, setActivePalette] = useState(0)
  const palette = PALETTES[activePalette]

  return (
    <ThemeContext.Provider value={{ activePalette, palette, setActivePalette }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
