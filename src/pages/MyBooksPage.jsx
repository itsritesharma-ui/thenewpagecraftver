import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import styles from './MyBooksPage.module.css'

const ALL_BOOKS = {
  1: {
    id: 1,
    title: 'Echoes of Freedom',
    author: 'Ritesh Sharma',
    image: '/echoes-of-freedom.jpg',
    category: 'History',
    pages: 83,
    // PDF stored in Supabase Storage bucket "books"
    pdfPath: 'echoes-of-freedom.pdf',
  },
}

// ── Protected PDF Viewer ─────────────────────────────────────────────
function PDFViewer({ pdfUrl, title, onClose }) {
  const canvasRef = useRef(null)
  const canvasRef2 = useRef(null)
  const containerRef = useRef(null)
  const [pdfjsLib, setPdfjsLib] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [scale, setScale] = useState(1.4)
  const [viewMode, setViewMode] = useState('single') // 'single' | 'double'
  const renderTaskRef = useRef(null)
  const renderTaskRef2 = useRef(null)

  // Load pdf.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      setPdfjsLib(window.pdfjsLib)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      setPdfjsLib(window.pdfjsLib)
    }
    document.head.appendChild(script)
  }, [])

  // Load PDF
  useEffect(() => {
    if (!pdfjsLib || !pdfUrl) return
    setLoading(true)
    pdfjsLib.getDocument({ url: pdfUrl, disableFontFace: false }).promise.then(doc => {
      setPdf(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
      setLoading(false)
    }).catch(err => {
      console.error('PDF load error:', err)
      setLoading(false)
    })
  }, [pdfjsLib, pdfUrl])

  // Render page(s)
  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    if (renderTaskRef.current) renderTaskRef.current.cancel()
    if (renderTaskRef2.current) renderTaskRef2.current.cancel()
    setRendering(true)

    const renderInto = (canvas, pageNum, taskRefHolder) => {
      if (!canvas || pageNum < 1 || pageNum > totalPages) {
        if (canvas) {
          const ctx = canvas.getContext('2d')
          canvas.width = 0
          canvas.height = 0
        }
        return Promise.resolve()
      }
      return pdf.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        const task = page.render({ canvasContext: ctx, viewport })
        taskRefHolder.current = task
        return task.promise
      })
    }

    const tasks = [renderInto(canvasRef.current, currentPage, renderTaskRef)]
    if (viewMode === 'double') {
      tasks.push(renderInto(canvasRef2.current, currentPage + 1, renderTaskRef2))
    }

    Promise.all(tasks).then(() => {
      setRendering(false)
    }).catch(err => {
      if (err?.name !== 'RenderingCancelledException') console.error(err)
      setRendering(false)
    })
  }, [pdf, currentPage, scale, viewMode, totalPages])

  // ── PROTECTION: block right-click, selection, keyboard shortcuts ──
  useEffect(() => {
    const block = (e) => e.preventDefault()
    const blockKeys = (e) => {
      // Block Ctrl+S, Ctrl+P, Ctrl+A, Ctrl+C, F12, PrintScreen
      if (
        (e.ctrlKey && ['s','p','a','c','u'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' || e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('contextmenu', block)
    document.addEventListener('keydown', blockKeys)
    // CSS: disable selection on the viewer
    const style = document.createElement('style')
    style.id = 'pdf-protection'
    style.textContent = `
      .${styles.viewer} * { user-select: none !important; -webkit-user-select: none !important; }
      .${styles.viewer} canvas { pointer-events: none; }
    `
    document.head.appendChild(style)
    return () => {
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('keydown', blockKeys)
      document.getElementById('pdf-protection')?.remove()
    }
  }, [])

  // Keyboard page nav
  useEffect(() => {
    const step = viewMode === 'double' ? 2 : 1
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrentPage(p => Math.min(p + step, totalPages))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrentPage(p => Math.max(p - step, 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [totalPages, viewMode])

  return (
    <div className={styles.viewer} onContextMenu={e => e.preventDefault()}>
      {/* Top bar */}
      <div className={styles.viewerBar}>
        <div className={styles.viewerTitle}>
          <img src="/logo.jpg" alt="The Pagecraft" className={styles.viewerLogo} />
          <span className={styles.viewerBrand}>The Pagecraft</span>
          <span className={styles.viewerBookTitle}>{title}</span>
        </div>
        <div className={styles.viewerControls}>
          <div className={styles.viewModeGroup}>
            <button
              className={viewMode === 'single' ? styles.viewModeActive : ''}
              onClick={() => { setViewMode('single'); setScale(1.4) }}
              title="1 Page view"
            >1 Page</button>
            <button
              className={viewMode === 'double' ? styles.viewModeActive : ''}
              onClick={() => { setViewMode('double'); setScale(0.8) }}
              title="2 Page view"
            >2 Page</button>
          </div>
          <div className={styles.viewerDivider} />
          <button onClick={() => setScale(s => Math.max(0.6, s - 0.2))} title="Zoom out">−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} title="Zoom in">+</button>
          <div className={styles.viewerDivider} />
          <button onClick={() => setCurrentPage(p => Math.max(1, p - (viewMode === 'double' ? 2 : 1)))} disabled={currentPage <= 1}>‹</button>
          <span className={styles.pageInfo}>
            {viewMode === 'double' && currentPage < totalPages
              ? `${currentPage}-${currentPage + 1} / ${totalPages}`
              : `${currentPage} / ${totalPages}`}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + (viewMode === 'double' ? 2 : 1)))} disabled={currentPage >= totalPages}>›</button>
          <div className={styles.viewerDivider} />
          <button className={styles.closeViewerBtn} onClick={onClose}>✕ Close</button>
        </div>
      </div>

      {/* Canvas area */}
      <div className={styles.canvasWrap} ref={containerRef}>
        {loading && (
          <div className={styles.loadingMsg}>
            <div className={styles.spinner} />
            Loading book...
          </div>
        )}
        {!loading && (
          <div className={`${styles.canvasInner} ${viewMode === 'double' ? styles.canvasInnerDouble : ''}`} style={{ opacity: rendering ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <canvas ref={canvasRef} className={styles.pdfCanvas} />
            {viewMode === 'double' && currentPage < totalPages && (
              <canvas ref={canvasRef2} className={styles.pdfCanvas} />
            )}
          </div>
        )}
        {/* Transparent overlay — blocks mouse interaction / selection */}
        <div className={styles.protectOverlay} onContextMenu={e => e.preventDefault()} />
      </div>

      {/* Bottom page nav */}
      <div className={styles.viewerFooter}>
        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>« First</button>
        <button onClick={() => setCurrentPage(p => Math.max(1, p - (viewMode === 'double' ? 2 : 1)))} disabled={currentPage <= 1}>‹ Prev</button>
        <span>
          {viewMode === 'double' && currentPage < totalPages
            ? `Pages ${currentPage}-${currentPage + 1} of ${totalPages}`
            : `Page ${currentPage} of ${totalPages}`}
        </span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + (viewMode === 'double' ? 2 : 1)))} disabled={currentPage >= totalPages}>Next ›</button>
        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Last »</button>
      </div>
    </div>
  )
}

// ── Main MyBooksPage ─────────────────────────────────────────────────
export default function MyBooksPage({ user, onClose }) {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeBook, setActiveBook] = useState(null) // { ...bookMeta, signedUrl }
  const [urlLoading, setUrlLoading] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('purchases')
      .select('product_id')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .then(({ data, error }) => {
        setLoading(false)
        if (error || !data) return
        const books = data.map(r => ALL_BOOKS[r.product_id]).filter(Boolean)
        // Deduplicate
        const unique = books.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)
        setPurchases(unique)
      })
  }, [user])

  const openBook = async (book) => {
    setUrlLoading(true)
    // Get signed URL from Supabase Storage (1 hour expiry)
    const { data, error } = await supabase.storage
      .from('books')
      .createSignedUrl(book.pdfPath, 3600)
    setUrlLoading(false)
    if (error || !data?.signedUrl) {
      alert('Could not load book. Please try again.')
      return
    }
    setActiveBook({ ...book, signedUrl: data.signedUrl })
  }

  // Full-screen PDF viewer
  if (activeBook) {
    return (
      <PDFViewer
        pdfUrl={activeBook.signedUrl}
        title={activeBook.title}
        onClose={() => setActiveBook(null)}
      />
    )
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            </div>
            <div>
              <h2 className={styles.title}>My Books</h2>
              <p className={styles.sub}>Your purchased library</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className={styles.body}>
          {loading && (
            <div className={styles.loadState}>
              <div className={styles.spinner} />
              <p>Loading your library...</p>
            </div>
          )}

          {!loading && !user && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🔒</span>
              <p className={styles.emptyTitle}>Login required</p>
              <p className={styles.emptySub}>Login to access your purchased books.</p>
            </div>
          )}

          {!loading && user && purchases.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📚</span>
              <p className={styles.emptyTitle}>No books yet</p>
              <p className={styles.emptySub}>Purchase an eBook from the eBooks section to read it here.</p>
              <button className={styles.browseBtn} onClick={onClose}>Browse eBooks →</button>
            </div>
          )}

          {!loading && purchases.length > 0 && (
            <div className={styles.bookGrid}>
              {purchases.map(book => (
                <div key={book.id} className={styles.bookCard}>
                  <div className={styles.bookCover}>
                    <img src={book.image} alt={book.title} />
                    <div className={styles.coverOverlay}>
                      <button
                        className={styles.readBtn}
                        onClick={() => openBook(book)}
                        disabled={urlLoading}
                      >
                        {urlLoading ? '...' : '📖 Read Now'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.bookInfo}>
                    <p className={styles.bookTitle}>{book.title}</p>
                    <p className={styles.bookAuthor}>by {book.author}</p>
                    <p className={styles.bookMeta}>{book.category} · {book.pages} pages</p>
                    <div className={styles.bookBadge}>✓ Owned</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
