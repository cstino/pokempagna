---
description: Linee guida per la creazione di animazioni di battaglia in stile "Classic Toon" per Pokémpagna.
---

# 🎨 Battle Animations: Classic Toon Guide

Questo documento definisce lo standard visivo per le animazioni di attacco in Pokémpagna, integrando i principi della skill `antigravity-design-expert`.

## 🧠 Filosofia: "Classic Toon" (Gooey Blob Style)
Ogni animazione elementale deve apparire come una sostanza liquida, gommosa e vibrante. Lo stile evita il realismo a favore di colori saturi e forme iconiche.

## 🛠️ Stack Tecnologico
- **Motore Animazione:** GSAP (GreenSock) per traiettorie e fisica.
- **Rendering:** Layer React con `position: absolute`.
- **Filtri Magici:** Filtro SVG "Gooey" (`feGaussianBlur` + `feColorMatrix`) per fondere le forme.

## 📐 Regole di Design (Antigravity Mode)

### 1. Elementali (Fuoco, Acqua, Erba, ecc.)
- **Forma:** Usare particelle circolari (`div`) con la classe `.toon-blob`.
- **Fusione:** Devono scorrere l'una sull'altra fondendosi come gocce di mercurio.
- **Traiettoria (Weightlessness):** Le fiamme/gocce non cadono per gravità, ma fluttuano con leggerezza e oscillazioni sinusoidali fluide.
- **Entrata Scalata (Staggered):** Le particelle non partono tutte insieme. Usare uno `stagger` di `0.015s` - `0.02s` per creare un flusso continuo.

### 2. Fisiche (Calcio, Pugno, Taglio)
- **Forma:** Geometrie nette (Stelle per impatti, Poligoni per Slashes).
- **Easing (Energy):** Usare `expo.in` o `back.out` per dare un senso di potenza e immediatezza.
- **Impact Flash:** Alla fine di ogni mossa fisica, aggiungere un `ToonBurst` con colori coordinati (Bianco/Giallo per Calci, Bianco puro per Tagli).

## 🎨 Palette Colori (Toon Palette)
- **Fuoco:** `#ff4d00` (Red), `#ff9500` (Orange), `#ffcc00` (Yellow).
- **Acqua:** `#3b82f6` (Blue), `#60a5fa` (Azure), `#93c5fd` (Cyan).
- **Erba:** `#10b981` (Emerald), `#4ade80` (Lime), `#166534` (Deep Green).
- **Impatto:** `#ffffff` (White Core) + bordo colorato.

## 🔄 Workflow per nuove mosse
1. **Identificazione:** La mossa è Elementale (blob) o Fisica (sharp)?
2. **Palette:** Scegliere 3 gradazioni di colore saturate.
3. **Posizionamento:** Niente traiettorie A -> B. Illuminare l'attaccante (punto A) come feedback visivo, ed eseguire tutte le animazioni della mossa (elementali o fisiche) **direttamente sul bersaglio** (punto B).
4. **Impact:** Aggiungere sempre un `createToonBurst` o uno `Slash` finale per feedback visivo sul bersaglio.

---
// Questo file funge da "memoria visiva" per l'agente Antigravity durante lo sviluppo di Pokémpagna.
