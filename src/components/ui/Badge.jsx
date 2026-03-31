import React from 'react';
import { getTypeColor, getTypeLabel, getTypeIcon } from '../../lib/typeColors';
import './Badge.css';

/**
 * Badge Component
 * Rende una medaglia premium basata sul tipo Pokémon.
 * @param {string} type - Tipo elementale (fuoco, acqua, ecc.)
 * @param {boolean} isEarned - Se la medaglia è stata conquistata
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
const Badge = ({ type, isEarned = false, size = 'md' }) => {
    const typeLabel = getTypeLabel(type);
    const typeColor = getTypeColor(type);


    return (
        <div className={`badge-container ${size} ${isEarned ? 'earned' : 'locked'}`} title={typeLabel}>
            <div className="badge-hexagon">
                <div className="badge-inner" style={{ backgroundColor: isEarned ? typeColor : 'rgba(255,255,255,0.05)' }}>
                    <div className="badge-shine" />
                    <img 
                        src={getTypeIcon(type)} 
                        alt={typeLabel} 
                        className="badge-icon"
                        style={{ filter: isEarned ? 'brightness(0) invert(1)' : 'grayscale(1) opacity(0.2)' }}
                    />
                </div>
            </div>
            <span className="badge-label">{typeLabel}</span>
        </div>
    );
};

export default Badge;
