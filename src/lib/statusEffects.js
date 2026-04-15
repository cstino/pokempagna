import { Flame, Droplets, Zap, Snowflake, Moon, Skull, Brain, Info, Timer } from 'lucide-react';

export const STATUS_CONDITIONS = {
  bruciatura: {
    id: 'bruciatura',
    nome: 'Bruciatura',
    icon: Flame,
    color: '#ef4444', // Red
    descrizione: 'Infligge danni ogni fine turno e dimezza i danni da mosse Fisiche.',
    tipo: 'permanente'
  },
  veleno: {
    id: 'veleno',
    nome: 'Veleno',
    icon: Droplets,
    color: '#a855f7', // Purple
    descrizione: 'Infligge danni modesti ogni fine turno.',
    tipo: 'permanente'
  },
  iperavvelenamento: {
    id: 'iperavvelenamento',
    nome: 'Iperavvelenamento',
    icon: Skull,
    color: '#7e22ce', // Dark Purple
    descrizione: 'Infligge danni crescenti ogni fine turno.',
    tipo: 'permanente'
  },
  paralisi: {
    id: 'paralisi',
    nome: 'Paralisi',
    icon: Zap,
    color: '#eab308', // Yellow
    descrizione: 'Dimezza la Velocità. Ha il 25% di possibilità di bloccare l\'attacco.',
    tipo: 'permanente'
  },
  congelamento: {
    id: 'congelamento',
    nome: 'Congelamento',
    icon: Snowflake,
    color: '#38bdf8', // Light Blue
    descrizione: 'Il Pokémon non può muoversi. C\'è una probabilità di scongelamento ad ogni turno.',
    tipo: 'permanente'
  },
  sonno: {
    id: 'sonno',
    nome: 'Sonno',
    icon: Moon,
    color: '#94a3b8', // Gray
    descrizione: 'Il Pokémon non può attaccare finché non si sveglia.',
    tipo: 'permanente'
  }
};

export const VOLATILE_STATUS = {
  confusione: {
    id: 'confusione',
    nome: 'Confusione',
    icon: Brain,
    color: '#db2777', // Pink
    descrizione: 'Probabilità di colpirsi da soli al posto di attaccare.',
    tipo: 'passeggero'
  },
  tentennamento: {
    id: 'tentennamento',
    nome: 'Tentennamento',
    icon: Timer,
    color: '#fb923c', // Orange
    descrizione: 'Salta il turno corrente per la troppa paura o lo shock.',
    tipo: 'passeggero'
  },
  parassiseme: {
    id: 'parassiseme',
    nome: 'Parassiseme',
    icon: Info,
    color: '#22c55e', // Green
    descrizione: 'Sottrae salute ogni turno trasferendola al bersaglio.',
    tipo: 'passeggero'
  },
  maledizione: {
    id: 'maledizione',
    nome: 'Maledizione',
    icon: Skull,
    color: '#4b5563', // Gray
    descrizione: 'Perde HP costantemente se maledetto da un tipo Spettro.',
    tipo: 'passeggero'
  },
  provocazione: {
    id: 'provocazione',
    nome: 'Provocazione',
    icon: Flame,
    color: '#be123c', // Rosa scuro/Rosso
    descrizione: 'Costringe a usare solo mosse di danno per alcuni turni.',
    tipo: 'passeggero'
  },
  innamoramento: {
    id: 'innamoramento',
    nome: 'Innamoramento',
    icon: Info,
    color: '#f43f5e', // Rosa vivo
    descrizione: 'Probabilità del 50% di non attaccare per l\'infatuazione.',
    tipo: 'passeggero'
  },
  ripeti: {
    id: 'ripeti',
    nome: 'Ripeti',
    icon: Timer,
    color: '#3b82f6', // Blu
    descrizione: 'Costringe a usare l\'ultima mossa per alcuni turni.',
    tipo: 'passeggero'
  },
  ultimocanto: {
    id: 'ultimocanto',
    nome: 'Ultimocanto',
    icon: Skull,
    color: '#000000', // Nero
    descrizione: 'K.O. automatico dopo 3 turni se non scambiato.',
    tipo: 'passeggero'
  },
  sostituto: {
    id: 'sostituto',
    nome: 'Sostituto',
    icon: Info,
    color: '#84cc16', // Verde Lime
    descrizione: 'Una bambola prende il danno e assorbe i problemi di stato.',
    tipo: 'passeggero'
  }
};

export const getStatusIcon = (statusId) => {
    return STATUS_CONDITIONS[statusId]?.icon || VOLATILE_STATUS[statusId]?.icon || Info;
};

export const getStatusColor = (statusId) => {
    return STATUS_CONDITIONS[statusId]?.color || VOLATILE_STATUS[statusId]?.color || '#ffffff';
};
