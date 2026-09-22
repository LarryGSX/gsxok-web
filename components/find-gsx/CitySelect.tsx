'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// An accessible, searchable "Select a city" combobox for the Find GSX
// browse-by-city directory (see RetailerLocator.tsx). Follows the ARIA 1.2
// editable-combobox-with-list-autocomplete pattern: role="combobox" lives on
// the text input itself, a role="listbox" popup holds role="option" items,
// and aria-activedescendant tracks the keyboard-highlighted option without
// ever moving DOM focus off the input. Options are plain <li> (not
// buttons) with onMouseDown preventDefault, which is what lets a mouse
// click commit a selection without the browser blurring the input first —
// no click-outside timeout hacks needed.
//
// This searches city names only — it has no awareness of retailer names,
// by design (see the parent component for how a selected city then filters
// the real retailer list).

interface CitySelectProps {
  id: string
  cities: string[]
  value: string | null
  onSelect: (city: string) => void
}

export function CitySelect({ id, cities, value, onSelect }: CitySelectProps) {
  const [query, setQuery] = useState(value ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeOptionRef = useRef<HTMLLIElement>(null)
  const listboxId = `${id}-listbox`

  // Whenever the list is closed, the input should reflect the committed
  // selection rather than whatever partial query was last typed.
  useEffect(() => {
    if (!isOpen) setQuery(value ?? '')
  }, [value, isOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities
  }, [cities, query])

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function openList() {
    setIsOpen(true)
    setActiveIndex(-1)
  }

  function commitSelection(city: string) {
    onSelect(city)
    setQuery(city)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        openList()
        return
      }
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        openList()
        return
      }
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault()
        commitSelection(filtered[activeIndex])
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault()
        setIsOpen(false)
        setQuery(value ?? '')
      }
    }
  }

  const activeOptionId =
    activeIndex >= 0 && filtered[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined

  return (
    <div className="relative" style={{ maxWidth: '420px' }}>
      <label htmlFor={id} className="text-label" style={{ color: 'var(--color-muted)' }}>
        Select a city
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        value={query}
        placeholder="Choose a city"
        onFocus={() => openList()}
        onChange={(e) => {
          setQuery(e.target.value)
          openList()
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setIsOpen(false)}
        className="mt-1.5 h-11 w-full px-4 text-body-sm bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150"
      />
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Cities"
          className="absolute left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto bg-white border border-[var(--color-border)]"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-body-sm" style={{ color: 'var(--color-muted)' }}>
              No cities match &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((city, i) => (
              <li
                key={city}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={value === city}
                ref={i === activeIndex ? activeOptionRef : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commitSelection(city)}
                onMouseEnter={() => setActiveIndex(i)}
                className="px-4 py-2 text-body-sm text-[var(--color-dark)] cursor-pointer"
                style={i === activeIndex ? { backgroundColor: 'var(--color-cream)' } : undefined}
              >
                {city}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
