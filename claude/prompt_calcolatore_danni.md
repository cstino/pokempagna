# PROMPT ANTIGRAVITY — Calcolatore Danni Pokémpagna

## Contesto del Progetto
Pokémpagna è una web app React 19 + Vite + Supabase per gestire campagne RPG a tema Pokémon al tavolo. Lo schermo al centro del tavolo mostra un'arena (Hub.jsx) con i Pokémon in campo. Il Master gestisce tutto da `Battaglia.jsx`, i giocatori dal telefono via `Combat.jsx`. La sincronizzazione avviene in real-time tramite la tabella `battaglia_attiva` su Supabase, che contiene un campo JSONB `pokemon_in_campo` (array di oggetti Pokémon con HP, stats, condizioni, etc.) e un campo JSONB `mosse_in_coda` (array di azioni pianificate).

## Obiettivo
Implementare il **Calcolatore Danni** all'interno di `Battaglia.jsx` (dashboard Master). Quando il Master approva una notifica di tipo "Mossa" nella sezione Turni, si apre una finestra modale che guida il Master nel calcolo dei danni per ogni bersaglio della mossa.

---

## FLUSSO UTENTE COMPLETO

### Step 1 — Il Master approva una mossa nella coda turni
Nella sezione "TURNI BATTAGLIA" di `Battaglia.jsx`, quando il Master clicca il pulsante ✓ (approvazione) su una notifica di tipo Mossa, invece di limitarsi a segnare `approvata: true`, si apre il **Calcolatore Danni**.

### Step 2 — Finestra Calcolatore (per ogni bersaglio)
La finestra modale mostra una schermata per il **primo bersaglio** della mossa. Contiene:

1. **Header**: "[Nome Pokémon Attaccante] Lv.[X] usa [Nome Mossa] su [Nome Bersaglio]"
2. **Campo input "Risultato dei Dadi"**: un campo numerico dove il Master digita il risultato dei dadi fisici lanciati al tavolo
3. **Toggle "Colpo Critico"**: un interruttore Sì/No (default: No)
4. **Riepilogo parametri** (mostrati come info di sola lettura, calcolati automaticamente dal sistema):
   - Livello attaccante
   - Potenza della mossa (valore base dal DB)
   - Potenza totale (Potenza base + 2× risultato dadi)
   - Attacco usato (Fisico o Speciale, base o temporaneo — vedi logica sotto)
   - Difesa usata (Fisica o Speciale, base o temporanea — vedi logica sotto)
   - STAB (×1.333 se il tipo mossa corrisponde a uno dei tipi dell'attaccante, altrimenti ×1)
   - Efficacia (calcolata dalla type chart personalizzata — vedi sotto)
5. **Risultato calcolato**: un campo numerico **modificabile** dal Master, pre-compilato con il risultato della formula
6. **Pulsante "INVIA DANNI"**: sottrae il valore dal campo risultato agli HP del bersaglio nella `battaglia_attiva`, e invia un segnale per far partire l'animazione della mossa sull'Hub. **NON chiude la finestra**. Può essere premuto infinite volte (per mosse multi-hit come Doppiocalcio o Doppiasberla).
7. **Pulsante "Prossimo ▸"**: chiude la schermata del bersaglio corrente e passa al bersaglio successivo. Se era l'ultimo bersaglio, chiude completamente il calcolatore e segna la mossa come `approvata: true` nella coda.

### Step 3 — Dopo aver processato tutti i bersagli
La mossa viene segnata come approvata nella coda. Il Master torna alla vista normale dei turni.

---

## FORMULA DANNI (CUSTOM — NON è quella standard Pokémon!)

```
Danno = floor( ((2 × Lv / 5 + 2) × Potenza × A / D) / 55 × Efficacia × STAB )
```

### Variabili:

| Variabile | Definizione |
|-----------|-------------|
| **Lv** | `(Livello del Pokémon Attaccante × 2) + 10` |
| **Potenza** | `potenza_base_mossa + (2 × risultato_dadi)` — dove `potenza_base_mossa` è il campo `dadi` (o `potenza`) della mossa nel DB, e `risultato_dadi` è inserito dal Master |
| **A** (Attacco) | Se la mossa è di categoria `"fisico"` → usa `attacco` (o `attacco_attuale` se esiste) dell'attaccante. Se la mossa è di categoria `"speciale"` → usa `attacco_speciale` (o `attacco_speciale_attuale` se esiste). **Se Colpo Critico è attivo** → usa SEMPRE il valore BASE (non `_attuale`), ignorando i modificatori temporanei |
| **D** (Difesa) | Se la mossa è di categoria `"fisico"` → usa `difesa` (o `difesa_attuale` se esiste) del bersaglio. Se `"speciale"` → usa `difesa_speciale` (o `difesa_speciale_attuale`). **Se Colpo Critico è attivo** → usa SEMPRE il valore BASE |
| **Efficacia** | Calcolata con la type chart custom (vedi sotto). Il tipo della mossa viene confrontato con i tipi del Pokémon bersaglio (tipo1 e tipo2). I moltiplicatori si moltiplicano tra loro se il bersaglio ha due tipi |
| **STAB** | `1.333` se il tipo della mossa corrisponde a `tipo1` o `tipo2` dell'attaccante, altrimenti `1` |

### Colpo Critico:
Quando il toggle è attivo:
- Usa i valori di Attacco e Difesa **BASE** (non `_attuale`/temporanei)
- Il risultato finale viene moltiplicato **×2**

Quindi: `Danno_critico = floor(formula_normale_con_stat_base) × 2`

---

## TYPE CHART PERSONALIZZATA

I moltiplicatori di efficacia NON sono quelli standard Pokémon. Devi aggiornare la funzione `getTypeMultiplier()` in `src/lib/typeColors.js` per usare questi valori:

| Relazione | Moltiplicatore |
|-----------|---------------|
| Debolezza (super efficace) | `1.666` |
| Resistenza (non molto efficace) | `0.625` |
| Immunità | `0.1` (NON zero — il Master vuole vedere un risultato numerico per poterlo eventualmente modificare) |
| Neutro | `1` |

La struttura della `TYPE_CHART` esistente in `typeColors.js` va bene, ma i valori numerici devono diventare:
- Dove c'è `2` → metti `1.666`
- Dove c'è `0.5` → metti `0.625`
- Dove c'è `0` → metti `0.1`

Doppia debolezza = `1.666 × 1.666 = 2.777`
Doppia resistenza = `0.625 × 0.625 = 0.390625`

---

## DOVE TROVARE I DATI PER IL CALCOLO

### Pokémon Attaccante
L'attaccante è identificato dal campo `pkmn_id` nella notifica della coda (`mosse_in_coda`). Questo corrisponde all'`id` dell'oggetto in `pokemon_in_campo`. I dati delle sue statistiche permanenti (attacco, difesa, etc.) vanno recuperati dalla tabella `pokemon_giocatore` usando `original_id` del pokemon in campo. I dati temporanei (attacco_attuale, difesa_attuale, etc.) sono anch'essi nella stessa tabella.

I **tipi** dell'attaccante (`tipo1`, `tipo2`) servono per calcolare lo STAB. Vanno recuperati dalla tabella `pokemon_giocatore`.

### Pokémon Bersaglio
I bersagli sono nel campo `bersagli` della notifica (array di nomi). Per ogni bersaglio, cerca il Pokémon in `pokemon_in_campo` dal nome. Per recuperare le sue statistiche e i suoi tipi, usa `original_id` per fare query su `pokemon_giocatore`.

### Mossa
La mossa è identificata da `mossa_id` nella notifica. Fai query su `mosse_disponibili` per ottenere:
- `potenza` o `dadi` (il valore numerico di potenza base — nel DB il campo si chiama `dadi`)
- `categoria` (`"fisico"` o `"speciale"` — determina se usare ATK/DEF o SPATK/SPDEF)
- `tipo` (per calcolare efficacia e STAB)
- `priorita` (già usata per l'iniziativa, non serve nel calcolatore)

### Animazione
L'animazione è determinata dal tipo della mossa. Il campo nell'oggetto della coda si chiama `mossa_tipo`. Per triggerare l'animazione sull'Hub:
- Aggiorna `battaglia_attiva` impostando un campo `animazione_attiva` (o simile) con `{ tipo: mossa_tipo, livello: 1|2|3, bersaglio_id: id_del_bersaglio_in_campo }`. Il livello può essere determinato dalla potenza (1 = potenza ≤ 60, 2 = 61-100, 3 = > 100) o puoi semplicemente usare 1 per ora.
- L'Hub (`Hub.jsx`) deve ascoltare questo campo e triggerare `BattleAnimations` con le coordinate del Pokémon bersaglio.

> **NOTA**: se l'integrazione dell'animazione è troppo complessa in questo step, puoi limitarti a settare `is_damaged: true` sul bersaglio in `pokemon_in_campo` (già supportato per lo shake) e implementare l'animazione completa in un secondo momento. L'importante è che "Invia Danni" sottragga gli HP in modo immediato e visibile.

---

## VINCOLI TECNICI

1. **Non creare nuovi file**. Il calcolatore va implementato come componente/modale DENTRO `Battaglia.jsx` o come componente separato nella cartella `src/components/master/` (es. `DamageCalculator.jsx`).
2. **Stile coerente**: usa lo stesso stile CSS del progetto — dark theme (`#0f172a`, `#1e293b`), glassmorphism, font bold/display. Puoi aggiungere nuove classi CSS in `Battaglia.css` o in un nuovo file `DamageCalculator.css`.
3. **Supabase update**: quando "Invia Danni" viene premuto, aggiorna `pokemon_in_campo` nella `battaglia_attiva` sottraendo gli HP al bersaglio specifico (identificato dal suo `id` nell'array). Usa lo stesso pattern di `updateBattleStateLive()` già presente.
4. **Non rompere il flusso esistente**: le notifiche di tipo Fuga, Sostituzione e Oggetto NON aprono il calcolatore. Solo le notifiche con `mossa_id` lo aprono.
5. **Il campo risultato deve essere modificabile**: il Master deve poter cambiare il numero prima di premere "Invia Danni" perché ci sono variabili di gioco non programmabili.
6. **"Invia Danni" NON chiude la finestra**: ci sono mosse multi-hit. Il Master deve poter premere il pulsante più volte, eventualmente cambiando il risultato dei dadi tra un colpo e l'altro.
7. **Le mosse di categoria `"stato"` non infliggono danni**: se la mossa è di categoria `"stato"`, il calcolatore può mostrare un messaggio tipo "Mossa di stato — nessun danno da calcolare" con solo il pulsante per chiudere/passare al prossimo bersaglio.

---

## FILE DA MODIFICARE

| File | Cosa fare |
|------|-----------|
| `src/pages/master/Battaglia.jsx` | Aggiungere lo stato per il calcolatore, modificare `approvaTurno()` per aprirlo, aggiungere la modale del calcolatore |
| `src/pages/master/Battaglia.css` | Aggiungere stili per la modale calcolatore |
| `src/lib/typeColors.js` | Aggiornare `TYPE_CHART` con i nuovi moltiplicatori (1.666, 0.625, 0.1) |
| `src/pages/Hub.jsx` | (Opzionale) Aggiungere listener per triggerare animazioni quando arriva il segnale di danno |
| (Nuovo, opzionale) `src/components/master/DamageCalculator.jsx` | Se preferisci separare il componente |

---

## ACCEPTANCE CRITERIA

- [ ] Approvando una notifica di tipo Mossa nella coda, si apre il Calcolatore Danni
- [ ] Il calcolatore mostra header con attaccante, mossa, e bersaglio corrente
- [ ] C'è un campo numerico per inserire il risultato dei dadi
- [ ] C'è un toggle Colpo Critico Sì/No
- [ ] Il sistema calcola automaticamente il danno con la formula custom (÷55, STAB ×1.333, efficacia custom)
- [ ] Il risultato è mostrato in un campo modificabile
- [ ] Il pulsante "Invia Danni" sottrae gli HP al bersaglio in `battaglia_attiva` senza chiudere la finestra
- [ ] Il pulsante "Invia Danni" può essere premuto infinite volte
- [ ] C'è un pulsante per passare al bersaglio successivo o chiudere il calcolatore
- [ ] Le mosse di stato mostrano un messaggio appropriato senza calcolo danni
- [ ] Il Colpo Critico usa stat base (non temporanee) e moltiplica il danno ×2
- [ ] La TYPE_CHART in typeColors.js è aggiornata con i moltiplicatori custom
- [ ] Il flusso esistente (notifiche Fuga/Sostituzione/Oggetto) non è toccato
