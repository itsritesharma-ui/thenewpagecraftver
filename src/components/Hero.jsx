import { useEffect, useRef, useState } from 'react'
import { useContent } from '../context/ContentContext'
import styles from './Hero.module.css'

const AUTOPLAY_MS = 4200
const TRANSITION_MS = 420

export default function Hero({ onNavigate }) {
  const { products: BOOKS } = useContent()
  const heroRef = useRef(null)
  const timerRef = useRef(null)
  const transitionRef = useRef(null)
  const pausedRef = useRef(false)
  const touchStartX = useRef(null)

  const [activeIdx, setActiveIdx] = useState(0)
  const [animDir, setAnimDir] = useState('in')

  useEffect(() => {
    if (BOOKS.length && activeIdx >= BOOKS.length) setActiveIdx(0)
  }, [BOOKS.length, activeIdx])

  const goTo = (nextIdx) => {
    if (nextIdx === activeIdx) return
    setAnimDir('out')
    clearTimeout(transitionRef.current)
    transitionRef.current = setTimeout(() => {
      setActiveIdx(nextIdx)
      setAnimDir('in')
    }, TRANSITION_MS)
  }

  const next = () => goTo((activeIdx + 1) % BOOKS.length)
  const prev = () => goTo((activeIdx - 1 + BOOKS.length) % BOOKS.length)

  // Auto-advance slideshow — restarts cleanly whenever the active book
  // changes (manual click, arrow, or autoplay), so timing never gets
  // out of sync and a manual interaction doesn't get immediately
  // overridden by a stale timer.
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) next()
    }, AUTOPLAY_MS)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx])

  useEffect(() => () => clearTimeout(transitionRef.current), [])

  // Pause on hover / focus so people can actually read a card
  const handleMouseEnter = () => { pausedRef.current = true }
  const handleMouseLeave = () => { pausedRef.current = false }

  // Swipe support for touch devices
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev()
    }
    touchStartX.current = null
  }

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const handleMouse = (e) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      el.style.setProperty('--mx', x)
      el.style.setProperty('--my', y)
    }
    el.addEventListener('mousemove', handleMouse)
    return () => el.removeEventListener('mousemove', handleMouse)
  }, [])

  const book = BOOKS[activeIdx] || BOOKS[0]
  if (!book) return null

  return (
    <section className={styles.hero} ref={heroRef}>
      <div className={styles.bgLayer1} />
      <div className={styles.bgLayer2} />
      <div className={styles.grain} />

      <div className={styles.inner}>
        {/* Left */}
        <div className={styles.left}>
          <div className={styles.brandBadge}>
            <span className={styles.brandDot} />
            New Release Out Now
          </div>

          <h1 className={styles.headline}>
            <span className={styles.headlineTop}>Stories that</span>
            <em className={styles.headlineAccent}>echo through</em>
            <span className={styles.headlineBottom}>history.</span>
          </h1>

          <p className={styles.sub}>
            Powerful books on India's history, politics, and nature — written by Ritesh Sharma to challenge what you think you know.
          </p>

          <div className={styles.actions}>
            <a href="/ebooks" onClick={e => { e.preventDefault(); onNavigate('/ebooks') }} className={styles.btnPrimary}>
              Explore Books
            </a>
            <a href="#thoughts" className={styles.btnGhost}>Read Thoughts</a>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}><strong>3</strong><span>Titles</span></div>
            <div className={styles.statDivider} />
            <div className={styles.stat}><strong>5K+</strong><span>Readers</span></div>
            <div className={styles.statDivider} />
            <div className={styles.stat}><strong>4.9★</strong><span>Rating</span></div>
          </div>
        </div>

        {/* Right — Book Slideshow */}
        <div className={styles.right}>
          <div
            className={styles.bookShowcase}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Glow behind active book */}
            <div className={styles.bookGlow} />

            {/* Prev / Next arrows */}
            <button
              type="button"
              className={`${styles.navArrow} ${styles.navArrowLeft}`}
              onClick={prev}
              aria-label="Previous book"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.navArrow} ${styles.navArrowRight}`}
              onClick={next}
              aria-label="Next book"
            >
              ›
            </button>

            {/* All book covers arranged in cascade */}
            <div className={styles.bookStack}>
              {BOOKS.map((b, i) => {
                const offset = (i - activeIdx + BOOKS.length) % BOOKS.length
                // 0 = active, 1 = next-in-line, everything else = further back
                const pos = offset === 0 ? 0 : offset === 1 ? 1 : -1
                return (
                  <div
                    key={b.id}
                    className={`${styles.bookCard} ${i === activeIdx ? styles.bookActive : styles.bookInactive}`}
                    data-pos={pos}
                    onClick={() => goTo(i)}
                    style={{
                      zIndex: i === activeIdx ? 3 : pos === 1 ? 2 : 1,
                    }}
                  >
                    <img src={b.image} alt={b.title} className={styles.bookCover} loading="lazy" />
                    <div className={styles.bookShine} />
                  </div>
                )
              })}
            </div>

            {/* Active book info */}
            <div className={`${styles.bookInfo} ${animDir === 'out' ? styles.bookInfoOut : styles.bookInfoIn}`}>
              <span className={styles.bookBadge}>{book.badge}</span>
              <h3 className={styles.bookTitle}>{book.title}</h3>
              <p className={styles.bookSubtitle}>{book.subtitle}</p>
              {book.status === 'available' && book.amazonLink ? (
                <a href={book.amazonLink} target="_blank" rel="noopener noreferrer" className={styles.bookLink}>
                  Buy on Amazon ↗
                </a>
              ) : (
                <span className={styles.bookComingSoon}>Coming Soon</span>
              )}
            </div>

            {/* Dots */}
            <div className={styles.slideDots}>
              {BOOKS.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${i === activeIdx ? styles.dotActive : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Book ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.scrollHint}>
        <div className={styles.scrollLine} />
        <span>Scroll</span>
      </div>

      {/* Wavy divider into the next section */}
      <svg className={styles.wavyDivider} viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,40 C 240,90 480,0 720,30 C 960,60 1200,10 1440,40 L1440,80 L0,80 Z" />
      </svg>
    </section>
  )
}
