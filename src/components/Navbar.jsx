import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'

export default function Navbar({ cartCount, onCartOpen, user, onAuthOpen, onAccountOpen, onMyBooksOpen, onNavigate, currentPage }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0]
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  const handleNav = (e, path) => {
    e.preventDefault()
    onNavigate(path)
  }

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'eBooks', path: '/ebooks' },
    { label: 'About', path: '/#about' },
    { label: 'Support', path: '/contact' },
  ]

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.logo} onClick={(e) => handleNav(e, '/')}>
        <span className={styles.logoMark}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l1.9 5.8L20 9.5l-5.8 1.9L12 17l-1.9-5.8L4 9.5l6.1-1.7L12 2z"/>
          </svg>
        </span>
        <span className={styles.logoTextWrap}>
          <span className={styles.logoText}>The Pagecraft</span>
          <span className={styles.logoSub}>by Ritesh Sharma</span>
        </span>
      </div>

      <div className={styles.links}>
        {navLinks.map(({ label, path }) => (
          <a
            key={path}
            href={path}
            onClick={(e) => handleNav(e, path)}
            className={`${styles.link} ${currentPage === path.replace('/', '') || (currentPage === 'home' && path === '/') ? styles.active : ''} ${label === 'eBooks' ? styles.activeGold : ''}`}
          >
            {label}
          </a>
        ))}
        <a href="https://www.amazon.in/Echoes-Freedom-Stories-Independence-Uncovered-ebook/dp/B0GSS7P99D"
          target="_blank" rel="noopener noreferrer" className={styles.link}>Amazon ↗</a>
      </div>

      <div className={styles.actions}>
        {user ? (
          <button className={styles.userBtn} onClick={onAccountOpen}>
            {avatarUrl
              ? <img src={avatarUrl} alt={name} className={styles.userAvatarImg} referrerPolicy="no-referrer" />
              : <span className={styles.userAvatar}>{name?.[0]?.toUpperCase()}</span>
            }
            <span className={styles.userName}>{name}</span>
          </button>
        ) : (
          <button className={styles.loginBtn} onClick={onAuthOpen}>Login</button>
        )}
        {user && (
          <button className={styles.myBooksBtn} onClick={onMyBooksOpen} title="My Books">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <span className={styles.myBooksLabel}>My Books</span>
          </button>
        )}
        <button className={styles.cartBtn} onClick={onCartOpen} aria-label="Open cart">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
        </button>
      </div>
    </nav>
  )
}
