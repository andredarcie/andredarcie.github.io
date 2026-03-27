const STORAGE_KEY = "ai-platformer-trainer-best-v1";

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
