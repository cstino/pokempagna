import React from 'react';

export default function PokeballLogo({ size = 60, animated = true, grayscale = false, className = "" }) {
    return (
        <div
            className={`pokeball-logo-container ${className}`}
            style={{
                width: size,
                height: size,
                animation: animated ? 'float 3s ease-in-out infinite' : 'none',
                filter: grayscale ? 'grayscale(1) opacity(0.3)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
            }}
        >
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <linearGradient id="pokeball-grad-global" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="48" fill="none" stroke="#333" strokeWidth="3" />
                <path d="M 2 50 A 48 48 0 0 1 98 50" fill="url(#pokeball-grad-global)" />
                <path d="M 2 50 A 48 48 0 0 0 98 50" fill="#f5f5f5" />
                <line x1="2" y1="50" x2="98" y2="50" stroke="#333" strokeWidth="3" />
                <circle cx="50" cy="50" r="14" fill="#f5f5f5" stroke="#333" strokeWidth="3" />
                <circle cx="50" cy="50" r="8" fill="#333" />
                <circle cx="50" cy="50" r="5" fill="#666">
                    {animated && (
                        <animate attributeName="fill" values="#666;#818CF8;#666" dur="3s" repeatCount="indefinite" />
                    )}
                </circle>
            </svg>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .pokeball-logo-container {
                    display: inline-block;
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                }
            `}} />
        </div>
    );
}
