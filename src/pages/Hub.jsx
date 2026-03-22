export default function Hub() {
    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div className="card animate-fade-in" style={{ textAlign: 'center', padding: 'var(--space-3xl)', maxWidth: '500px' }}>
                <p style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>🏟️</p>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>
                    HUB Battaglia
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    L'HUB Battaglia sarà disponibile nello Step 11.<br />
                    Questa schermata è pensata per il monitor sul tavolo.
                </p>
            </div>
        </div>
    );
}
