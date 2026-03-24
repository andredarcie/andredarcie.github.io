const STORAGE_KEY = "impossible-cube-best-v2-neat";

export function saveBestGenome(snapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadBestGenome() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearBestGenome() {
  localStorage.removeItem(STORAGE_KEY);
}
