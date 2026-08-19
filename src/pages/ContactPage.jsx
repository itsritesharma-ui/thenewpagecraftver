import { useState } from 'react'
import styles from './ContactPage.module.css'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [issue, setIssue] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Support Request from ${name || 'Website User'}`)
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nIssue / Message:\n${issue}`
    )
    window.location.href = `mailto:itsritesharma261@gmail.com?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.label}>
          <span className={styles.line} />
          <span className={styles.labelText}>Get In Touch</span>
          <span className={styles.line} />
        </div>
        <h1 className={styles.title}>Contact &amp; Support</h1>
        <p className={styles.sub}>
          Got a question, an issue with an order, or feedback to share? Fill out the form below and it'll open directly in your email app, ready to send to Ritesh.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name">Your Name</label>
            <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">Your Email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className={styles.field}>
            <label htmlFor="issue">Your Issue / Message</label>
            <textarea id="issue" required rows={6} value={issue} onChange={e => setIssue(e.target.value)} placeholder="Describe your issue, question, or feedback..." />
          </div>
          <button type="submit" className={styles.submitBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Send Message
          </button>
          {sent && <p className={styles.sentNote}>Your email app should now be open with your message ready to send.</p>}
        </form>

        <div className={styles.altCard}>
          <p className={styles.altLabel}>Prefer email directly?</p>
          <a href="mailto:itsritesharma261@gmail.com" className={styles.altEmail}>itsritesharma261@gmail.com</a>
          <p className={styles.altResponse}>Usually responds within 24–48 hours</p>
        </div>

        <div className={styles.ownerCard}>
          <p className={styles.ownerLabel}>THEPAGECRAFT ONLY</p>
          <a href="/tpc-owner-261/" className={styles.ownerLink} aria-label="ThePageCraft private access">
            <span className={styles.ownerMark}>TPC</span>
            <span className={styles.ownerText}>Private access</span>
            <span className={styles.ownerArrow}>↗</span>
          </a>
        </div>
      </div>
    </section>
  )
}
