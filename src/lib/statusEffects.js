import { Flame, Droplets, Zap, Snowflake, Moon, Skull, Brain, Info, Timer, Shield } from 'lucide-react';

export const STATUS_CONDITIONS = {
  bruciatura: {
    id: 'bruciatura',
    nome: 'Bruciatura',
    icon: Flame,
    color: '#ef4444', // Red
    descrizione: 'Moltiplica l\'attacco temporaneo x0.5.',
    tipo: 'permanente'
  },
  veleno: {
    id: 'veleno',
    nome: 'Veleno',
    icon: Droplets,
    color: '#a855f7', // Purple
    descrizione: 'Nessun effetto aggiuntivo.',
    tipo: 'permanente'
  },
  iperavvelenamento: {
    id: 'iperavvelenamento',
    nome: 'Iperavvelenamento',
    icon: Skull,
    color: '#7e22ce', // Dark Purple
    descrizione: 'Nessun effetto aggiuntivo.',
    tipo: 'permanente'
  },
  paralisi: {
    id: 'paralisi',
    nome: 'Paralisi',
    icon: Zap,
    color: '#eab308', // Yellow
    descrizione: 'Moltiplica la velocità temporanea x0.5.',
    tipo: 'permanente'
  },
  congelamento: {
    id: 'congelamento',
    nome: 'Congelamento',
    icon: Snowflake,
    color: '#38bdf8', // Light Blue
    descrizione: 'Moltiplica l\'attacco speciale temporaneo x0.5.',
    tipo: 'permanente'
  },
  sonno: {
    id: 'sonno',
    nome: 'Sonno',
    icon: Moon,
    color: '#94a3b8', // Gray
    descrizione: 'Nessun effetto aggiuntivo.',
    tipo: 'permanente'
  },
  confusione: {
    id: 'confusione',
    nome: 'Confuso',
    icon: Brain,
    color: '#db2777', // Pink
    descrizione: 'Nessun effetto aggiuntivo.',
    tipo: 'permanente'
  },
  infatuazione: {
    id: 'infatuazione',
    nome: 'Infatuato',
    icon: Info,
    color: '#f43f5e', // Rosa vivo
    descrizione: 'Nessun effetto aggiuntivo.',
    tipo: 'permanente'
  }
};

export const VOLATILE_STATUS = {
  tentennamento: { id: 'tentennamento', nome: 'Tentennamento', icon: Timer, color: '#fb923c' },
  parassiseme: { id: 'parassiseme', nome: 'Parassiseme', icon: Droplets, color: '#22c55e' },
  maledizione: { id: 'maledizione', nome: 'Maledizione', icon: Skull, color: '#4b5563' },
  provocazione: { id: 'provocazione', nome: 'Provocazione', icon: Flame, color: '#be123c' },
  ripeti: { id: 'ripeti', nome: 'Ripeti', icon: Timer, color: '#3b82f6' },
  ultimocanto: { id: 'ultimocanto', nome: 'Ultimocanto', icon: Skull, color: '#000000' },
  sostituto: { id: 'sostituto', nome: 'Sostituto', icon: Shield, color: '#84cc16' },
  sgomento: { id: 'sgomento', nome: 'Sgomento', icon: Brain, color: '#9333ea' },
  inibitore: { id: 'inibitore', nome: 'Inibitore', icon: Zap, color: '#eab308' },
  protezione: { id: 'protezione', nome: 'Protezione', icon: Shield, color: '#6ee7b7' },
  sbadiglio: { id: 'sbadiglio', nome: 'Sbadiglio', icon: Moon, color: '#cbd5e1' },
  divieto: { id: 'divieto', nome: 'Divieto', icon: Timer, color: '#dc2626' },
  anticura: { id: 'anticura', nome: 'Anticura', icon: Timer, color: '#b91c1c' },
  acquanello: { id: 'acquanello', nome: 'Acquanello', icon: Droplets, color: '#60a5fa' },
  radicamento: { id: 'radicamento', nome: 'Radicamento', icon: Droplets, color: '#15803d' },
  pazienza: { id: 'pazienza', nome: 'Pazienza', icon: Brain, color: '#f59e0b' },
  destinobbligato: { id: 'destinobbligato', nome: 'Destinobbligato', icon: Skull, color: '#374151' },
  rancore: { id: 'rancore', nome: 'Rancore', icon: Skull, color: '#6b7280' },
  energifocus: { id: 'energifocus', nome: 'Energifocus', icon: Zap, color: '#facc15' },
  magivelo: { id: 'magivelo', nome: 'Magivelo', icon: Shield, color: '#c084fc' },
  magnetascesa: { id: 'magnetascesa', nome: 'Magnetascesa', icon: Zap, color: '#fbbf24' },
  incubo: { id: 'incubo', nome: 'Incubo', icon: Skull, color: '#1e1b4b' },
  levitocinesi: { id: 'levitocinesi', nome: 'Levitocinesi', icon: Brain, color: '#a855f7' },
  telecinesi: { id: 'telecinesi', nome: 'Telecinesi', icon: Brain, color: '#d8b4fe' },
  cambiaposto: { id: 'cambiaposto', nome: 'Cambiaposto', icon: Timer, color: '#0ea5e9' }
};

export const getStatusIcon = (statusId) => {
    return STATUS_CONDITIONS[statusId]?.icon || VOLATILE_STATUS[statusId]?.icon || Info;
};

export const getStatusColor = (statusId) => {
    return STATUS_CONDITIONS[statusId]?.color || VOLATILE_STATUS[statusId]?.color || '#ffffff';
};
