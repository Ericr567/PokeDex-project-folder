const STORAGE_KEY = "pokedex-ux-events";
const MAX_EVENTS = 200;

export const trackUxEvent = (name, payload = {}) => {
  if (!name) return;

  const entry = {
    name,
    payload,
    ts: new Date().toISOString(),
  };

  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const current = currentRaw ? JSON.parse(currentRaw) : [];
    const next = [...current, entry].slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore analytics persistence errors.
  }
};

export const getUxEvents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
