import { Users } from 'lucide-react';

export default function Party() {
    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Users size={32} color="#a78bfa" />
                    Party
                </h1>
                <p className="page-subtitle">Gestione giocatori e Pokémon</p>
            </div>
            <div className="card flex-center" style={{ flexDirection: 'column', padding: 'var(--space-3xl)' }}>
                <div style={{ padding: '24px', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                    <Users size={48} color="#a78bfa" />
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                    La sezione Party sarà disponibile nello Step 4
                </p>
            </div>
        </div>
    );
}
