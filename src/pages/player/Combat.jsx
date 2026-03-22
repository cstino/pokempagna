import { Swords } from 'lucide-react';

export default function Combat() {
    return (
        <div className="animate-fade-in" style={{ paddingTop: '70px', paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Swords size={32} color="#ef4444" />
                    Combat
                </h1>
                <p className="page-subtitle">Azione e attacchi</p>
            </div>
            <div className="card flex-center" style={{ flexDirection: 'column', padding: 'var(--space-3xl)' }}>
                <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                    <Swords size={48} color="#ef4444" />
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                    La sezione Combat sarà disponibile nello Step 12
                </p>
            </div>
        </div>
    );
}
