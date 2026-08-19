import { useRef, useEffect } from 'react'
import Hero from '../components/Hero'
import ImpactStats from '../components/ImpactStats'
import DailyPost from '../components/DailyPost'
import styles from './HomePage.module.css'

const JOURNEY = [
  {
    id: 1,
    image: '/echoes-of-freedom.jpg',
    eyebrow: 'The Beginning',
    title: 'Every story starts with a single page',
    text: "Writing my first book while preparing for NEET wasn't easy — late nights, early mornings, and a constant battle between two dreams. But I learned that passion finds time, even when there is none.",
  },
  {
    id: 2,
    image: '/real-bihar-1.jpg',
    eyebrow: 'The Process',
    title: 'Discipline is the bridge between dreams and reality',
    text: "Between chapters and study sessions, I discovered that consistency matters more than intensity. A little progress every day — on my books and on my goals — adds up to something extraordinary.",
  },
  {
    id: 3,
    image: '/nature-never-lies-1.jpg',
    eyebrow: 'The Belief',
    title: 'Your struggle today is someone else\'s motivation tomorrow',
    text: "Whether it's chasing a medical seat or finishing a book — the journey is never wasted. Every effort shapes you. Keep going, keep writing, keep believing in the version of yourself you're becoming.",
  },
]


function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.dataset.visible = 'true'; obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function JourneyEntry({ item, index }) {
  const ref = useReveal()
  const reversed = index % 2 === 1
  return (
    <div className={`${styles.journeyEntry} ${reversed ? styles.journeyReversed : ''}`} ref={ref} data-visible="false" style={{ transitionDelay: `${index * 0.08}s` }}>
      <div className={styles.journeyImageWrap}>
        <img src={item.image} alt={item.title} className={styles.journeyImage} />
      </div>
      <div className={styles.journeyContent}>
        <span className={styles.journeyEyebrow}>{item.eyebrow}</span>
        <h3 className={styles.journeyTitle}>{item.title}</h3>
        <p className={styles.journeyText}>{item.text}</p>
      </div>
    </div>
  )
}

export default function HomePage({ onAuthOpen, user, onNavigate, onOpenPost }) {
  const aboutRef = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) e.target.dataset.visible = 'true' },
      { threshold: 0.1 }
    )
    if (aboutRef.current) obs.observe(aboutRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <Hero onNavigate={onNavigate} />

      <ImpactStats />

      <DailyPost onOpenPost={onOpenPost} />

      {/* ── Journey ──────────────────────────── */}
      <section className={styles.feed} id="thoughts">
        <div className={styles.feedLabel}>
          <span className={styles.labelLine} />
          <span className={styles.labelText}>The Journey So Far</span>
          <span className={styles.labelLine} />
        </div>
        <div className={styles.feedTitle}>
          <h2>Behind The <em>Pages</em></h2>
          <p>A glimpse into the journey, the discipline, and the motivation behind every story.</p>
        </div>

        <div className={styles.journeyList}>
          {JOURNEY.map((item, i) => (
            <JourneyEntry key={item.id} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* ── About ──────────────────────────── */}
      <section className={styles.about} id="about" ref={aboutRef} data-visible="false">
        <div className={styles.aboutInner}>
          <div className={styles.aboutLeft}>
            <p className={styles.eyebrow}>About the Author</p>
            <h2 className={styles.aboutName}>Ritesh Sharma</h2>
            <p className={styles.aboutText}>
              Ritesh Sharma is a NEET aspirant by ambition and a storyteller by heart. While preparing relentlessly for one of India's toughest exams, he carved out time to chase another dream — writing.
            </p>
            <p className={styles.aboutText} style={{ marginTop: '16px' }}>
              His debut book <em>Echoes of Freedom</em> is now live, exploring the untold stories of India's fight for independence. Balancing NEET preparation with authorship, Ritesh proves that discipline and passion can walk side by side — and that every struggle has a story worth telling.
            </p>
            <div className={styles.aboutBtns}>
              <a href="/ebooks" className={styles.btnPrimary} onClick={e => { e.preventDefault(); onNavigate('/ebooks') }}>
                View All Books →
              </a>
              {!user && (
                <button className={styles.btnGhost} onClick={onAuthOpen}>
                  Create Account
                </button>
              )}
            </div>
          </div>
          <div className={styles.aboutRight}>
            <div className={styles.statGrid}>
              {[
                { val: '3', label: 'Titles' },
                { val: '5K+', label: 'Readers' },
                { val: '4.9★', label: 'Rating' },
                { val: '🇮🇳', label: 'Made in India' },
              ].map(s => (
                <div className={styles.stat} key={s.label}>
                  <strong>{s.val}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </>
  )
}
