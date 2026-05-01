
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getTypeColor, getTypeIcon, getTypeMultiplier } from '../../lib/typeColors';
import { Zap, Target, Swords, Shield, ChevronRight, Check, Loader2, Info } from 'lucide-react';
import './DamageCalculator.css';

export default function DamageCalculator({ turn, battleState, onClose, onDanniInviati }) {
    const [loading, setLoading] = useState(true);
    const [attacker, setAttacker] = useState(null);
    const [moveInfo, setMoveInfo] = useState(null);
    const [targets, setTargets] = useState([]);
    const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
    const [errorMsg, setErrorMsg] = useState(null);
    
    // Calculation State
    const [diceResult, setDiceResult] = useState(0);
    const [isCritical, setIsCritical] = useState(false);
    const [manualDamage, setManualDamage] = useState(0);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (turn) {
            initCalculator();
        }
    }, [turn]);

    async function initCalculator() {
        console.log("Initializing Damage Calculator for turn:", turn);
        setLoading(true);
        setErrorMsg(null);
        try {
            if (!turn || !battleState) {
                throw new Error("Dati insufficienti per inizializzare il calcolatore.");
            }

            // 1. Fetch move info
            let { data: moveData, error: moveError } = await supabase
                .from('mosse_disponibili')
                .select('*')
                .eq('id', turn.mossa_id)
                .maybeSingle();
            
            // Fallback: se non la trova, forse mossa_id è l'ID di mosse_pokemon
            if (!moveData && !moveError) {
                console.warn("Mossa non trovata in mosse_disponibili, provo in mosse_pokemon...");
                const { data: relData, error: relError } = await supabase
                    .from('mosse_pokemon')
                    .select('mossa_id, info:mosse_disponibili(*)')
                    .eq('id', turn.mossa_id)
                    .maybeSingle();
                
                if (relData && relData.info) {
                    moveData = relData.info;
                }
            }

            if (moveError) throw moveError;
            if (!moveData) throw new Error(`Mossa (ID: ${turn.mossa_id}) non trovata nel database.`);
            setMoveInfo(moveData);

            // 2. Find attacker in battleState
            const campo = battleState.pokemon_in_campo || [];
            const attackerInstance = campo.find(p => 
                p.id === turn.pkmn_id || p.original_id === turn.pkmn_id
            );

            let attackerData = null;

            if (attackerInstance) {
                // Fetch detailed stats for attacker using original_id
                const { data: stats, error: statsError } = await supabase
                    .from('pokemon_giocatore')
                    .select('*')
                    .eq('id', attackerInstance.original_id)
                    .maybeSingle();
                
                if (statsError) throw statsError;
                attackerData = { ...attackerInstance, ...stats };
            } else {
                // Fallback: se non è in campo, proviamo comunque a caricare le stats dal DB se turn.pkmn_id è un UUID
                console.warn("Attaccante non trovato in campo, provo query diretta via ID:", turn.pkmn_id);
                const { data: stats, error: statsError } = await supabase
                    .from('pokemon_giocatore')
                    .select('*')
                    .eq('id', turn.pkmn_id)
                    .maybeSingle();
                
                if (statsError) throw statsError;
                if (!stats) throw new Error("Impossibile trovare l'attaccante né in campo né nel database.");
                attackerData = { id: turn.pkmn_id, ...stats };
            }
            setAttacker(attackerData);

            // 3. Find targets in battleState and fetch their stats
            const targetsData = [];
            for (const targetFull of turn.bersagli || []) {
                // Puliamo il nome (rimuoviamo " di Allenatore" se presente)
                const name = targetFull.split(' di ')[0];
                const instance = campo.find(p => p.nome === name);
                if (instance && instance.original_id) {
                    const { data: stats, error: tError } = await supabase
                        .from('pokemon_giocatore')
                        .select('*')
                        .eq('id', instance.original_id)
                        .maybeSingle();
                    
                    if (!tError && stats) {
                        targetsData.push({ ...instance, ...stats });
                    }
                } else {
                    console.warn(`Bersaglio "${name}" non trovato o senza original_id.`);
                }
            }
            
            if (targetsData.length === 0) {
                throw new Error("Nessun bersaglio valido trovato per questa mossa.");
            }
            
            setTargets(targetsData);
            setDiceResult(0);
            setIsCritical(false);
            setCurrentTargetIndex(0);
        } catch (err) {
            console.error("Errore inizializzazione Calcolatore:", err);
            setErrorMsg(err.message || "Errore sconosciuto durante l'inizializzazione.");
        } finally {
            setLoading(false);
        }
    }

    const currentTarget = targets[currentTargetIndex];

    // Formula Calculation
    useEffect(() => {
        if (!attacker || !moveInfo || !currentTarget) return;

        if (moveInfo.categoria === 'status') {
            setManualDamage(0);
            return;
        }

        const Lv = (attacker.livello * 2) + 10;
        const basePower = parseInt(moveInfo.dadi || moveInfo.potenza || 0);
        const totalPower = basePower + (2 * diceResult);

        // Attacker Stat (A)
        const isSpecial = moveInfo.categoria === 'speciale';
        const atkStat = isSpecial 
            ? (isCritical ? (attacker.attacco_speciale || 1) : (attacker.attacco_speciale_attuale || attacker.attacco_speciale || 1))
            : (isCritical ? (attacker.attacco || 1) : (attacker.attacco_attuale || attacker.attacco || 1));

        // Defender Stat (D)
        const defStat = isSpecial
            ? (isCritical ? (currentTarget.difesa_speciale || 1) : (currentTarget.difesa_speciale_attuale || currentTarget.difesa_speciale || 1))
            : (isCritical ? (currentTarget.difesa || 1) : (currentTarget.difesa_attuale || currentTarget.difesa || 1));

        // STAB
        const attackerTypes = [attacker.tipo1, attacker.tipo2].filter(Boolean).map(t => t.toLowerCase());
        const moveType = moveInfo.tipo?.toLowerCase();
        const stab = attackerTypes.includes(moveType) ? 1.333 : 1;

        // Effectiveness
        const targetTypes = [currentTarget.tipo1, currentTarget.tipo2].filter(Boolean);
        const effectiveness = getTypeMultiplier(moveType, targetTypes);

        // Core Formula
        // Danno = floor( ((2 × Lv / 5 + 2) × Potenza × A / D) / 55 × Efficacia × STAB )
        let damage = Math.floor((((2 * Lv / 5 + 2) * totalPower * atkStat / Math.max(1, defStat)) / 55) * effectiveness * stab);
        
        if (isCritical) {
            damage *= 2;
        }

        setManualDamage(damage);
    }, [diceResult, isCritical, currentTargetIndex, attacker, moveInfo, targets]);

    async function sendDamage() {
        if (!currentTarget) {
            alert("Errore: Bersaglio non selezionato.");
            return;
        }
        setSending(true);
        try {
            const newHp = Math.max(0, (currentTarget.hp || 0) - manualDamage);
            console.log(`[DEBUG] Invio danni a ${currentTarget.nome} (ID: ${currentTarget.id}): ${currentTarget.hp} -> ${newHp}`);
            
            // 1. Aggiorna Tabella Temporanea (Battaglia)
            // Usiamo una ricerca più robusta per ID o per Nome+Allenatore come fallback
            const updatedCampo = (battleState.pokemon_in_campo || []).map(p => {
                const isMatch = p.id === currentTarget.id || (p.nome === currentTarget.nome && p.allenatore === currentTarget.allenatore);
                if (isMatch) {
                    return { ...p, hp: newHp, is_damaged: true };
                }
                return p;
            });

            const { error: battleError } = await supabase
                .from('battaglia_attiva')
                .update({ pokemon_in_campo: updatedCampo })
                .eq('id', battleState.id);

            if (battleError) throw battleError;

            // 2. Aggiorna Tabella Permanente (Pokemon Giocatore)
            if (currentTarget.original_id) {
                await supabase
                    .from('pokemon_giocatore')
                    .update({ hp_attuale: newHp })
                    .eq('id', currentTarget.original_id);
            }

            // 3. Aggiorna lo stato locale
            setTargets(prev => prev.map(t => 
                (t.id === currentTarget.id) ? { ...t, hp: newHp } : t
            ));

            alert(`Danni inviati con successo! ${currentTarget.nome} ora ha ${newHp} HP.`);

            // Reset animazione shake
            setTimeout(async () => {
                try {
                    const { data: latest, error: fetchErr } = await supabase
                        .from('battaglia_attiva')
                        .select('pokemon_in_campo')
                        .eq('id', battleState.id)
                        .maybeSingle();
                    
                    if (fetchErr) throw fetchErr;
                    if (latest && latest.pokemon_in_campo) {
                        // IMPORTANTE: Assicuriamoci di non sovrascrivere HP aggiornati nel frattempo
                        const cleanCampo = latest.pokemon_in_campo.map(p => {
                            const isMatch = p.id === currentTarget.id || (p.nome === currentTarget.nome && p.allenatore === currentTarget.allenatore);
                            if (isMatch) {
                                return { ...p, is_damaged: false };
                            }
                            return p;
                        });
                        
                        await supabase.from('battaglia_attiva')
                            .update({ pokemon_in_campo: cleanCampo })
                            .eq('id', battleState.id);
                        
                        console.log(`[DEBUG] Reset animazione completato per ${currentTarget.nome}`);
                    }
                } catch (resetErr) {
                    console.error("Errore durante il reset animazione:", resetErr);
                }
            }, 1500); // Aumentato a 1.5s per sicurezza

            if (onDanniInviati) onDanniInviati(currentTarget.id, manualDamage);
        } catch (err) {
            console.error("Errore invio danni:", err);
            alert("ERRORE durante l'invio dei danni: " + err.message);
        } finally {
            setSending(false);
        }
    }

    function basePowerToAnimLevel(power) {
        if (power <= 60) return 1;
        if (power <= 100) return 2;
        return 3;
    }

    const nextTarget = () => {
        if (currentTargetIndex < targets.length - 1) {
            setCurrentTargetIndex(prev => prev + 1);
            setDiceResult(0);
            setIsCritical(false);
        } else {
            onClose(true); // true means fully completed
        }
    };

    if (loading) {
        return (
            <div className="damage-calculator-modal flex-center p-3xl" style={{ minHeight: '300px' }}>
                <div className="flex-column align-center gap-16">
                    <Loader2 className="spin" size={40} color="#ef4444" />
                    <p style={{ opacity: 0.7, fontWeight: 700 }}>Inizializzazione Calcolatore...</p>
                </div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="damage-calculator-modal p-xl flex-column align-center gap-20">
                <div className="error-icon-circle" style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '20px', borderRadius: '50%' }}>
                    <Info size={40} color="#ef4444" />
                </div>
                <div className="text-center">
                    <h3 style={{ marginBottom: '8px' }}>Errore Calcolatore</h3>
                    <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>{errorMsg}</p>
                </div>
                <button className="btn-next-target" style={{ width: '100%' }} onClick={() => onClose(false)}>CHIUDI</button>
            </div>
        );
    }

    if (!currentTarget || !attacker || !moveInfo) return null;

    const basePower = parseInt(moveInfo.dadi || moveInfo.potenza || 0);

    return (
        <div className="damage-calculator-modal animate-slide-up">
            <div className="dc-header">
                <div className="flex-column">
                    <span style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '2px', fontWeight: 900 }}>DASHBOARD MASTER</span>
                    <h2>Calcolatore Danni</h2>
                </div>
                <button className="btn-circle" onClick={() => onClose(false)}>✕</button>
            </div>

            <div className="dc-body">
                <div className="dc-targets-nav">
                    {targets.map((_, i) => (
                        <div key={i} className={`target-dot ${i === currentTargetIndex ? 'active' : ''}`}></div>
                    ))}
                </div>

                <div className="dc-summary">
                    <img src={attacker.immagine_url} className="dc-pkmn-icon" alt={attacker.nome} />
                    <div className="dc-summary-info">
                        <div className="battle-line">
                            <strong>{attacker.nome}</strong> Lv.{attacker.livello} <ChevronRight size={12} style={{ margin: '0 4px', opacity: 0.5 }} /> <strong>{currentTarget.nome}</strong>
                        </div>
                        <div className="move-line" style={{ color: getTypeColor(moveInfo.tipo) }}>
                            {moveInfo.nome}
                        </div>
                    </div>
                    <div className="move-type-icon">
                        <img src={getTypeIcon(moveInfo.tipo)} alt={moveInfo.tipo} width={32} />
                    </div>
                </div>

                {moveInfo.categoria === 'status' ? (
                    <div className="dc-status-msg">
                        <Info size={32} opacity={0.3} style={{ margin: '0 auto 12px' }} />
                        <p>Questa è una mossa di <strong>STATO</strong>.<br/>Non infligge danni diretti.</p>
                    </div>
                ) : (
                    <div className="dc-grid">
                        <div className="dc-input-group">
                            <label>Risultato dei Dadi (Fisici)</label>
                            <div className="dice-input-wrapper">
                                <input 
                                    type="number" 
                                    value={diceResult} 
                                    onChange={(e) => setDiceResult(parseInt(e.target.value) || 0)}
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>

                        <div className="dc-input-group">
                            <label>Modificatori</label>
                            <div 
                                className={`crit-toggle ${isCritical ? 'active' : ''}`}
                                onClick={() => setIsCritical(!isCritical)}
                            >
                                <span>COLPO CRITICO</span>
                                <div className="toggle-switch">
                                    <div className="switch-thumb"></div>
                                </div>
                            </div>
                        </div>

                        <div className="dc-parameters">
                            <div className="param-item">
                                <label>Pot. Base</label>
                                <span>{basePower}</span>
                            </div>
                            <div className="param-item">
                                <label>Pot. Totale</label>
                                <span style={{ color: '#fbbf24' }}>{basePower + (2 * diceResult)}</span>
                            </div>
                            <div className="param-item">
                                <label>{moveInfo.categoria === 'speciale' ? 'SP. ATK' : 'ATTACCO'}</label>
                                <span>
                                    {moveInfo.categoria === 'speciale' 
                                        ? (isCritical ? (attacker.attacco_speciale || 1) : (attacker.attacco_speciale_attuale || attacker.attacco_speciale || 1))
                                        : (isCritical ? (attacker.attacco || 1) : (attacker.attacco_attuale || attacker.attacco || 1))
                                    }
                                </span>
                            </div>
                            <div className="param-item">
                                <label>{moveInfo.categoria === 'speciale' ? 'SP. DEF' : 'DIFESA'}</label>
                                <span>
                                    {moveInfo.categoria === 'speciale'
                                        ? (isCritical ? (currentTarget.difesa_speciale || 1) : (currentTarget.difesa_speciale_attuale || currentTarget.difesa_speciale || 1))
                                        : (isCritical ? (currentTarget.difesa || 1) : (currentTarget.difesa_attuale || currentTarget.difesa || 1))
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="dc-result-area">
                            <label>HP da Sottrarre</label>
                            <input 
                                type="number" 
                                className="result-input-large"
                                value={manualDamage}
                                onChange={(e) => setManualDamage(parseInt(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="dc-footer">
                {moveInfo.categoria !== 'status' && (
                    <button className="btn-send-damage" onClick={sendDamage} disabled={sending}>
                        {sending ? <Loader2 className="spin" size={18} /> : <Zap size={18} fill="currentColor" />} 
                        Invia Danni
                    </button>
                )}
                <button className="btn-next-target" onClick={nextTarget}>
                    {currentTargetIndex < targets.length - 1 ? (
                        <>Prossimo <ChevronRight size={18} /></>
                    ) : (
                        <>Completa <Check size={18} /></>
                    )}
                </button>
            </div>
        </div>
    );
}
