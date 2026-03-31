import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadProfileData = async (userId) => {
            try {
                let { data, error } = await supabase
                    .from('giocatori')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (error) throw error;

                if (!data) {
                    const { data: userData } = await supabase.auth.getUser();

                    const userNome = userData?.user?.user_metadata?.nome || userData?.user?.email?.split('@')[0] || 'Allenatore';
                    const userRuolo = userData?.user?.user_metadata?.ruolo || 'giocatore';

                    const { data: newProfile, error: insertError } = await supabase
                        .from('giocatori')
                        .insert({
                            id: userId,
                            nome: userNome,
                            ruolo: userRuolo,
                            livello_allenatore: 1,
                            hp: 100,
                            hp_max: 100,
                            forza: 10,
                            destrezza: 10,
                            punti_tlp: 0,
                            medaglie: [],
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;
                    data = newProfile;
                }

                if (mounted) {
                    setProfile(data);
                }
                return data;
            } catch (err) {
                console.error("Errore nel caricamento del profilo:", err);
                if (mounted) setProfile(null);
                return null;
            }
        };

        // 1. Inizializzazione stabile della Sessione (stile DED)
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Critical error in getSession:", error);
                if (mounted) setLoading(false);
                return;
            }

            if (session?.user) {
                setUser(session.user);
                // Carichiamo il profilo in modo sicuro
                loadProfileData(session.user.id).finally(() => {
                    if (mounted) setLoading(false);
                });
            } else {
                if (mounted) setLoading(false);
            }
        }).catch((err) => {
            console.error("Critical promise rejection in getSession:", err);
            if (mounted) setLoading(false);
        });

        // 2. Ascoltatore Eventi di Auth (stile DED)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            if (!mounted) return;

            if (currentSession?.user) {
                setUser(currentSession.user);
                loadProfileData(currentSession.user.id).finally(() => {
                    if (mounted) setLoading(false);
                });
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // La funzione manuale refreshProfile che serve all'app per forzare l'aggiornamento
    async function refreshProfile() {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('giocatori')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) throw error;
            setProfile(data);
        } catch (err) {
            console.error("Errore durante refreshProfile:", err);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }

    async function signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    }

    async function signUp(email, password, nome, ruolo = 'giocatore') {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nome: nome,
                    ruolo: ruolo
                }
            }
        });
        if (error) throw error;

        // Se per qualche motivo Supabase registra l'utente ma non avvia la sessione, 
        // ed essendo la conferma email disattivata, forziamo il login.
        if (data.user && !data.session) {
            try {
                await supabase.auth.signInWithPassword({ email, password });
            } catch (err) {
                console.error("Auto-login post-registrazione fallito:", err);
            }
        }

        // NOTA: Non creiamo più il profilo qui (evita conflict di chiave primaria).
        // onAuthStateChange vedrà l'utente loggato, chiamerà loadProfileData,
        // la quale vedrà che non c'è il profilo e lo creerà in modo sicuro
        // inserendo i metadata corretti (nome, ruolo) passati in fase di registrazione.

        return data;
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setProfile(null);
    }

    const value = {
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        ismaster: profile?.ruolo === 'master',
        isPlayer: profile?.ruolo === 'giocatore',
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve essere usato dentro un AuthProvider');
    }
    return context;
}
