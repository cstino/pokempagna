import { Map } from 'lucide-react';

export default function Campagna() {
    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Map size={32} color="#56e3ff" />
                        Campagna
                    </h1>
                    <p className="page-subtitle">Mappa, appunti e lore</p>
                </div>
            </div>
            <div className="card flex-center" style={{ flexDirection: 'column', padding: 'var(--space-3xl)' }}>
                <div style={{ padding: '24px', background: 'rgba(86, 227, 255, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                    <Map size={48} color="#56e3ff" />
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                    La sezione Campagna sarà disponibile nello Step 16
                </p>
            </div>
        </div>
    );
}
