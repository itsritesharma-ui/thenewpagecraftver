# Ritesh & Co Publishers — Store Website

Premium dark-theme digital product store with animations, cart, and checkout.

---

## Setup (VS Code mein kaise chalayein)

### Step 1 — Node.js install karo
https://nodejs.org se LTS version download karo aur install karo.

### Step 2 — Folder VS Code mein open karo
- VS Code open karo
- File → Open Folder → `ritesh-store` folder select karo

### Step 3 — Terminal open karo
VS Code mein: `Ctrl + `` (backtick) dabao

### Step 4 — Dependencies install karo
```bash
npm install
```

### Step 5 — Website start karo
```bash
npm run dev
```

Browser mein `http://localhost:5173` open hoga — tumhari website ready!

---

## Build for production (deploy ke liye)
```bash
npm run build
```
`dist/` folder banta hai — ise Netlify, Vercel ya any hosting par upload karo.

---

## Files structure
```
ritesh-store/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx        ← Top navigation + logo
│   │   ├── Hero.jsx          ← Hero section
│   │   ├── ProductCard.jsx   ← Product cards
│   │   └── CartPanel.jsx     ← Cart + Checkout sidebar
│   ├── data/
│   │   └── products.js       ← Products list (yahan apne products add karo)
│   ├── App.jsx               ← Main app
│   └── index.css             ← Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Apne products kaise add karein
`src/data/products.js` file mein products array mein naya item add karo:
```js
{
  id: 7,
  title: "Meri Nayi Book",
  category: "Business",
  price: 399,
  description: "Ek zabardast description.",
  emoji: "📚",
  badge: "New",   // ya null
}
```

## Real payments (Razorpay)
Razorpay integrate karne ke liye batao — main CartPanel mein add kar dunga.
