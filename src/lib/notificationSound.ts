// Sonido de aviso dentro de la app. Se usa Web Audio en vez de <audio> porque un elemento <audio>
// toma el "foco de audio" del celular y pausa la música que esté sonando; Web Audio se mezcla encima.
const SOUND_URL = '/notification.wav';

let ctx: AudioContext | null = null;
let bufferPromise: Promise<AudioBuffer> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  // iOS 16.4+: 'ambient' mezcla con otra música en lugar de interrumpirla.
  try { if ((navigator as any).audioSession) (navigator as any).audioSession.type = 'ambient'; } catch {}
  ctx = new Ctor();
  return ctx;
}

function loadBuffer(c: AudioContext): Promise<AudioBuffer> {
  if (!bufferPromise) {
    bufferPromise = fetch(SOUND_URL)
      .then((r) => r.arrayBuffer())
      .then((data) => c.decodeAudioData(data))
      .catch((e) => { bufferPromise = null; throw e; });
  }
  return bufferPromise;
}

// Los navegadores solo dejan iniciar audio tras un toque del usuario: se prepara en el primer toque.
if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    c.resume().catch(() => {});
    loadBuffer(c).catch(() => {});
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export async function playNotificationSound() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') await c.resume();
    const buffer = await loadBuffer(c);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start();
  } catch {
    // sin permiso de audio todavía: no pasa nada, la notificación push avisa de todos modos
  }
}
