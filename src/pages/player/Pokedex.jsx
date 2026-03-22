import { Book } from 'lucide-react';

export default function Pokedex() {
    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Book size={32} color="#3b82f6" />
                    Pokédex
                </h1>
                <p className="page-subtitle">Enciclopedia e mosse</p>
            </div>
            <div className="card flex-center" style={{ flexDirection: 'column', padding: 'var(--space-3xl)' }}>
                <div style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                    <Book size={48} color="#3b82f6" />
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                    La sezione Pokédex sarà disponibile nello Step 5
                </p>
            </div>
        </div>
    );
}
