import { Star } from 'lucide-react';

export default function Squadra() {
    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Star size={32} color="#fcd34d" />
                    Squadra
                </h1>
                <p className="page-subtitle">I tuoi Pokémon attivi</p>
            </div>
            <div className="card flex-center" style={{ flexDirection: 'column', padding: 'var(--space-3xl)' }}>
                <div style={{ padding: '24px', background: 'rgba(252, 211, 77, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                    <Star size={48} color="#fcd34d" />
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                    La sezione Squadra sarà disponibile nello Step 9
                </p>
            </div>
        </div>
    );
}
