export const LEVELS = [
  { level: 1,  name: 'Iniciante Literário',        minXp: 0,    color: '#8B9DC3' },
  { level: 2,  name: 'Leitor Casual',              minXp: 100,  color: '#7EB8D4' },
  { level: 3,  name: 'Aprendiz da Biblioteca',     minXp: 250,  color: '#6EC8A8' },
  { level: 4,  name: 'Explorador de Histórias',    minXp: 450,  color: '#5BBDE0' },
  { level: 5,  name: 'Colecionador de Páginas',    minXp: 700,  color: '#4DAAFF' },
  { level: 6,  name: 'Guardião dos Livros',        minXp: 1000, color: '#5579F0' },
  { level: 7,  name: 'Sonhador Literário',         minXp: 1400, color: '#7B5EA7' },
  { level: 8,  name: 'Viajante das Histórias',     minXp: 1900, color: '#9B4DCA' },
  { level: 9,  name: 'Mestre dos Capítulos',       minXp: 2500, color: '#C44DCA' },
  { level: 10, name: 'Observador da Biblioteca',   minXp: 3200, color: '#D4507A' },
  { level: 11, name: 'Curador de Histórias',       minXp: 4000, color: '#E05B50' },
  { level: 12, name: 'Arquiteto Literário',        minXp: 5000, color: '#E07050' },
  { level: 13, name: 'Sábio das Narrativas',       minXp: 6200, color: '#E09A2A' },
  { level: 14, name: 'Devorador de Livros',        minXp: 7600, color: '#D4B800' },
  { level: 15, name: 'Guardião da BlueBooks',      minXp: 9200, color: '#2054BC' },
  { level: 16, name: 'Lenda dos Capítulos',        minXp: 11000,color: '#1A8CFF' },
  { level: 17, name: 'Mestre das Estrelas Literárias', minXp: 13000, color: '#00C6FF' },
  { level: 18, name: 'Espírito da Biblioteca',     minXp: 15500,color: '#00E5B0' },
  { level: 19, name: 'Constelação Literária',      minXp: 18500,color: '#C0E000' },
  { level: 20, name: 'Entidade Literária',         minXp: 22000,color: '#FFD700' },
];

export function getLevelInfo(xp = 0) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }
  const progress = next
    ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100;
  return { current, next, progress, xp };
}

export const XP = {
  LOGIN_DAILY: 10,
  CREATE_BLOG: 50,
  RECEIVE_LIKE: 5,
  SEND_COMMENT: 8,
  SEND_CHAT_MSG: 2,
  JOIN_CINEBLUE: 30,
  WATCH_SESSION: 20,
};
