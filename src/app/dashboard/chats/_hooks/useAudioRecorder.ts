'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { audioFileInfo, pickRecorderMimeType } from '../_lib/audio-format';

/** Gris de las barras de la onda: = --color-wa-muted (el canvas no lee clases de Tailwind). */
const WAVE_COLOR = '#8696a0';

/**
 * Grabación de notas de voz: micrófono, MediaRecorder, contador de segundos y la onda en un <canvas>.
 * Devuelve `canvasRef` para que la barra de grabación pinte ahí la onda.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  // Cancelar llama a stop(), y `onstop` llega después: sin esta marca el audio cancelado volvía a quedar listo para enviar.
  const discardRef = useRef(false);

  const stopMeters = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
  };

  // Al salir de la pantalla a media grabación: soltar micrófono, timer y animación.
  useEffect(() => {
    return () => {
      stopMeters();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        discardRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = pickRecorderMimeType();
      const mediaRecorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      discardRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // El tipo real con el que grabó el navegador (mp4 en Safari/iPhone y Chrome, ogg en Firefox).
        stream.getTracks().forEach(track => track.stop());
        if (discardRef.current) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: audioFileInfo(mediaRecorder.mimeType).mimeType });
        setRecordedAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Web Audio API para la onda en vivo
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; // datos en el dominio del tiempo para el volumen
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      // Historial de volúmenes para la onda que avanza
      const volumeHistory: number[] = [];
      let lastPushTime = performance.now();

      const draw = (time: number) => {
        if (!canvasRef.current) {
          animationFrameRef.current = requestAnimationFrame(draw);
          return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        // Volumen (RMS)
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (dataArray[i] / 128.0) - 1.0;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        // Una barra nueva cada 50 ms, solo las que caben en el canvas
        if (time - lastPushTime > 50) {
          volumeHistory.push(rms);
          const maxBars = Math.floor(canvas.width / 4); // 2px barra + 2px espacio
          if (volumeHistory.length > maxBars) volumeHistory.shift();
          lastPushTime = time;
        }

        // Resolución real en pantallas Retina para que se vea nítida
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Estilo WhatsApp Web, escalado por DPR
        const barWidth = 2 * dpr;
        const gap = 2 * dpr;
        const step = barWidth + gap;
        let x = canvas.width - barWidth; // se dibuja de derecha a izquierda

        ctx.fillStyle = WAVE_COLOR;
        for (let i = volumeHistory.length - 1; i >= 0; i--) {
          if (x < 0) break;
          const vol = volumeHistory[i];
          // Exagera un poco los volúmenes bajos
          const barHeight = Math.min(canvas.height * 0.9, Math.max(2, vol * canvas.height * 3));
          const y = (canvas.height - barHeight) / 2;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
          ctx.fill();
          x -= step;
        }
      };

      draw(performance.now());

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      toast.error('No se pudo acceder al micrófono.');
    }
  };

  /** Termina la grabación y deja el audio listo para enviar. */
  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopMeters();
    }
  };

  /** Descarta la grabación (en curso o ya terminada). */
  const cancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      discardRef.current = true;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordedAudio(null);
    setDuration(0);
    stopMeters();
  };

  /** Después de enviar: olvida el audio grabado. */
  const clearRecorded = useCallback(() => setRecordedAudio(null), []);

  return { isRecording, duration, recordedAudio, canvasRef, start, stop, cancel, clearRecorded };
}

export type AudioRecorder = ReturnType<typeof useAudioRecorder>;
