import { Backpack } from 'lucide-react';

export default function Zaino() {
    return (
        <div className="animate-fade-in" style={{ paddingTop: '70px', paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Backpack size={32} color="#f59e0b" />
                    Zaino
                </h1>
                <p className="page-subtitle">Oggetti e strumenti</p>
            </div>
            <div className="card flex-center" style={{ flexDirection: 'column', padding: 'var(--space-3xl)' }}>
                <div style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                    <Backpack size={48} color="#f59e0b" />
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                    La sezione Zaino sarà disponibile nello Step 8
                </p>
            </div>
        </div>
    );
}
