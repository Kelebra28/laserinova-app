import Panel from "../atoms/Panel";
import InsightTile from "../molecules/InsightTile";
import { EmptyState } from "../atoms/EmptyState";
import { HEATMAP_BLOCK_HOURS, HEATMAP_DAY_NAMES, HEATMAP_LEVEL_STYLE, HEATMAP_WORK_HOURS } from "@/constants/dashboard.constants";
import { formatHour } from "@/constants/formatters.constants";
import type { DashboardOverview } from "@/types/dashboard";

type Props = { heatmap: DashboardOverview["whatsapp"]["heatmap"] };

const BLOCKS = 24 / HEATMAP_BLOCK_HOURS;
const hourRange = (h: number) => `${formatHour(h)}–${formatHour((h + 1) % 24)}`;

/** ¿Cuándo escriben los clientes? Casillas de 3 horas por día, con el número de mensajes. */
export default function ActivityHeatmapCard({ heatmap }: Props) {
  const blocks = heatmap.map((row) => Array.from({ length: BLOCKS }, (_, b) => row.slice(b * HEATMAP_BLOCK_HOURS, (b + 1) * HEATMAP_BLOCK_HOURS).reduce((s, v) => s + v, 0)));
  const max = Math.max(...blocks.flat(), 1);
  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const total = heatmap.flat().reduce((s, v) => s + v, 0);

  const byHour = Array.from({ length: 24 }, (_, h) => heatmap.reduce((s, row) => s + row[h], 0));
  const byDay = heatmap.map((row) => row.reduce((s, v) => s + v, 0));
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const peakDay = byDay.indexOf(Math.max(...byDay));
  const work = byHour.slice(HEATMAP_WORK_HOURS.from, HEATMAP_WORK_HOURS.to).reduce((s, v) => s + v, 0);
  const workShare = total > 0 ? (work / total) * 100 : 0;
  const peakCell = blocks.flatMap((r, d) => r.map((v, b) => ({ v, d, b }))).reduce((a, c) => (c.v > a.v ? c : a));

  return (
    <Panel title="¿Cuándo escriben los clientes?" subtitle={`Mensajes recibidos por día y horario · últimos 30 días${total ? ` · ${total.toLocaleString("es-MX")} en total` : ""}`} className="h-full">
      {total === 0 ? (
        <EmptyState text="Sin mensajes en los últimos 30 días" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <InsightTile label="Día más activo" value={HEATMAP_DAY_NAMES[peakDay]} sub={`${byDay[peakDay].toLocaleString("es-MX")} mensajes`} />
            <InsightTile label="Hora pico" value={hourRange(peakHour)} sub={`${byHour[peakHour].toLocaleString("es-MX")} mensajes`} />
            <InsightTile
              label={`De ${formatHour(HEATMAP_WORK_HOURS.from)} a ${formatHour(HEATMAP_WORK_HOURS.to)}`}
              value={`${workShare.toFixed(0)}%`}
              sub={workShare >= 50 ? "escriben en horario laboral" : "escriben fuera de horario laboral"}
            />
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: `76px repeat(${BLOCKS}, minmax(0, 1fr))` }}>
                <span />
                {Array.from({ length: BLOCKS }, (_, b) => (
                  <span key={b} className="text-[11px] font-semibold text-gray-500 text-center leading-tight">
                    {formatHour(b * HEATMAP_BLOCK_HOURS)}
                  </span>
                ))}
                {blocks.map((row, d) => (
                  <HeatRow key={d} day={HEATMAP_DAY_NAMES[d]} row={row} level={level} isPeak={(b) => peakCell.d === d && peakCell.b === b} />
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            Cada casilla suma {HEATMAP_BLOCK_HOURS} horas desde la hora de arriba (ej. <b>9 am</b> = 9 a 12). El número es cuántos mensajes llegaron; entre más oscuro, más mensajes. El recuadro negro es el pico.
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
            Pocos
            {[1, 2, 3, 4].map((l) => (
              <span key={l} className={`h-3.5 w-6 rounded ${HEATMAP_LEVEL_STYLE[l]}`} />
            ))}
            Muchos
          </div>
        </>
      )}
    </Panel>
  );
}

function HeatRow({ day, row, level, isPeak }: { day: string; row: number[]; level: (v: number) => number; isPeak: (b: number) => boolean }) {
  return (
    <>
      <span className="text-xs font-semibold text-gray-600 self-center">{day.slice(0, 3)}</span>
      {row.map((v, b) => (
        <span
          key={b}
          title={`${day} ${formatHour(b * HEATMAP_BLOCK_HOURS)} a ${formatHour((b * HEATMAP_BLOCK_HOURS + HEATMAP_BLOCK_HOURS) % 24)} · ${v} mensaje${v === 1 ? "" : "s"}`}
          className={`h-9 rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums ${HEATMAP_LEVEL_STYLE[level(v)]} ${isPeak(b) ? "ring-2 ring-gray-900" : ""}`}
        >
          {v > 0 ? v : ""}
        </span>
      ))}
    </>
  );
}
