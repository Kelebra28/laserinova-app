import { ImapFlow } from "imapflow";
import { prisma } from "@/lib/prisma";
import { getImapConfig, mailboxName } from "@/lib/email-imap";
import { makeSnippet, SNIPPET_PLACEHOLDER } from "@/lib/email-snippet";

/**
 * Sincronización del buzón IMAP → CRM, compartida por el botón "Sincronizar", la revisión automática de
 * la pantalla y la revisión programada (cron). Es INCREMENTAL por defecto: solo trae lo posterior al
 * último UID que ya se tiene (segundos en vez de releer 400 correos); la pasada completa (`full`) además
 * revisa las demás carpetas y reconcilia lo leído desde otro dispositivo.
 */

export type NewMail = { from: string; subject: string };
export type SyncResult = { syncedCount: number; newInbox: NewMail[] };

// Una sincronización a la vez por usuario: dos juntas se chocaban y duplicaban o agotaban el tiempo.
const running = new Set<string>();

function extractAddress(addrArray: any) {
  if (!addrArray || !Array.isArray(addrArray) || !addrArray.length) return "";
  return addrArray.map((a) => `${a.name ? `"${a.name}" ` : ""}<${a.address}>`).join(", ");
}

const FOLDERS: { names: string[]; db: string; max: number }[] = [
  { names: ["INBOX"], db: "INBOX", max: 400 },
  { names: ["INBOX.Sent", "Sent", "Sent Messages", "Enviados"], db: "SENT", max: 30 },
  { names: ["INBOX.Junk", "Junk", "Spam", "INBOX.Spam", "Correo no deseado"], db: "SPAM", max: 20 },
  { names: ["INBOX.Trash", "Trash", "Deleted Messages", "Papelera"], db: "TRASH", max: 20 },
];

/** Devuelve null si ya hay una sincronización de ese usuario en curso. */
export async function runMailboxSync(userId: string, opts: { full?: boolean; timeoutMs?: number } = {}): Promise<SyncResult | null> {
  if (running.has(userId)) return null;
  running.add(userId);
  // El candado se suelta hasta que la sincronización REAL termina (no al agotarse el tiempo de espera),
  // para que una pasada lenta no se encime con la siguiente.
  const work = syncMailbox(userId, !!opts.full).finally(() => running.delete(userId));
  work.catch(() => {});
  return Promise.race([
    work,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("IMAP Sync Timeout")), opts.timeoutMs ?? 90000)),
  ]);
}

async function syncMailbox(userId: string, full: boolean): Promise<SyncResult> {
  const cfg = await getImapConfig(userId);
  if (!cfg) throw new Error("No se encontraron credenciales de correo configuradas.");

  const client = new ImapFlow({
    host: cfg.host,
    port: 993,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
    connectionTimeout: 8000,
  });
  await client.connect();

  let syncedCount = 0;
  const newInbox: NewMail[] = [];
  const clientCache = new Map<string, string | null>();
  let snippetBudget = 30; // vistas previas que se descargan en esta pasada; el resto las rellena el relleno de abajo

  const syncFolder = async (folderNames: string[], dbFolder: string, maxCount: number) => {
    for (const folderName of folderNames) {
      try {
        const lock = await client.getMailboxLock(folderName);
        try {
          const total = client.mailbox ? (client.mailbox as any).exists : 0;
          if (total > 0) {
            // Incremental: desde el último UID conocido. Completa: las últimas `maxCount` posiciones.
            const lastUid = (await prisma.email.aggregate({ where: { userId, folder: dbFolder, uid: { gt: 0 } }, _max: { uid: true } }))._max.uid ?? 0;
            const incremental = !full && lastUid > 0;
            const range = incremental ? `${lastUid + 1}:*` : `${Math.max(1, total - (maxCount - 1))}:*`;
            const msgList: any[] = [];
            for await (const msg of client.fetch(range, { uid: true, envelope: true, internalDate: true, flags: true }, incremental ? { uid: true } : undefined)) {
              // "N:*" siempre devuelve al menos el último mensaje, aunque ya lo tengamos
              if (incremental && msg.uid <= lastUid) continue;
              msgList.push(msg);
            }

            if (msgList.length) {
              const knownRows = await prisma.email.findMany({
                where: { userId, folder: dbFolder, uid: { in: msgList.map((m) => m.uid).filter(Boolean) as number[] } },
                select: { id: true, uid: true, isRead: true },
              });
              const known = new Map(knownRows.map((r) => [r.uid, r]));

              // Lo ya leído en el servidor (otro dispositivo o webmail) se marca leído aquí; nunca al revés.
              const nowRead = msgList
                .filter((m) => {
                  const k = m.uid ? known.get(m.uid) : undefined;
                  return k && !k.isRead && (m.flags as Set<string> | undefined)?.has("\\Seen");
                })
                .map((m) => known.get(m.uid)!.id);
              if (nowRead.length) await prisma.email.updateMany({ where: { id: { in: nowRead } }, data: { isRead: true } });

              // Del más viejo al más nuevo: así, si la pasada se corta, el último UID guardado es continuo y la siguiente rápida sigue desde ahí
              for (const msg of msgList) {
                if (!msg.uid || known.get(msg.uid)) continue;

                // Si ese mismo correo ya está en el CRM en otra carpeta (se movió aquí), no se vuelve a crear.
                const realMessageId = msg.envelope?.messageId;
                if (realMessageId) {
                  const movedHere = await prisma.email.findFirst({ where: { userId, messageId: realMessageId }, select: { id: true } });
                  if (movedHere) continue;
                }

                const from = extractAddress(msg.envelope?.from) || "";
                const subject = msg.envelope?.subject || "(Sin Asunto)";
                // Ligar al cliente por su dirección (remitente en recibidos, destinatario en enviados)
                const counterpart = ((dbFolder === "SENT" ? msg.envelope?.to?.[0]?.address : msg.envelope?.from?.[0]?.address) || "").toLowerCase();
                let clientId: string | null = null;
                if (counterpart) {
                  if (!clientCache.has(counterpart)) {
                    clientCache.set(counterpart, (await prisma.client.findFirst({ where: { email: counterpart }, select: { id: true } }))?.id ?? null);
                  }
                  clientId = clientCache.get(counterpart) ?? null;
                }
                const flags: Set<string> = msg.flags || new Set();

                // Vista previa: solo se baja el inicio del mensaje (20 KB), no el correo completo
                let snippet = SNIPPET_PLACEHOLDER;
                if (snippetBudget > 0) {
                  snippetBudget--;
                  try {
                    const part: any = await client.fetchOne(String(msg.uid), { source: { maxLength: 20000 } } as any, { uid: true });
                    if (part?.source) snippet = await makeSnippet(part.source as Buffer);
                  } catch { /* se queda el texto de relleno y lo completa el relleno posterior */ }
                }

                try {
                await prisma.email.create({
                  data: {
                    userId,
                    clientId,
                    isRead: dbFolder === "SENT" ? true : flags.has("\\Seen"),
                    isStarred: flags.has("\\Flagged"),
                    threadId: msg.envelope?.inReplyTo || null,
                    uid: msg.uid,
                    messageId: realMessageId || `${msg.uid}@local-${dbFolder.toLowerCase()}`,
                    subject,
                    from,
                    to: extractAddress(msg.envelope?.to) || "",
                    cc: extractAddress(msg.envelope?.cc) || "",
                    bcc: extractAddress(msg.envelope?.bcc) || "",
                    snippet,
                    receivedAt: msg.internalDate || msg.envelope?.date || new Date(),
                    folder: dbFolder,
                  },
                });
                } catch (e: any) {
                  // Otra sincronización (cron o pantalla) ya guardó este mismo correo: se ignora, no se aborta la carpeta
                  if (e?.code === "P2002") continue;
                  throw e;
                }
                syncedCount++;
                if (dbFolder === "INBOX" && !flags.has("\\Seen")) newInbox.push({ from, subject });
              }
            }
          }
        } finally {
          lock.release();
        }
        break; // ya se encontró la carpeta; no se prueban los otros nombres
      } catch (e: any) {
        console.warn(`Folder ${folderName} sync error:`, e?.message);
      }
    }
  };

  // Relleno de vistas previas de los correos que ya estaban sin ellas, de a poco en cada pasada (tope de 15 s)
  const backfillSnippets = async () => {
    const t0 = Date.now();
    const pending = await prisma.email.findMany({
      where: { userId, snippet: SNIPPET_PLACEHOLDER, uid: { gt: 0 } },
      orderBy: { receivedAt: "desc" },
      take: 30,
      select: { id: true, uid: true, folder: true },
    });
    const byFolder = new Map<string, typeof pending>();
    for (const r of pending) byFolder.set(r.folder, [...(byFolder.get(r.folder) || []), r]);
    for (const [folder, rows] of byFolder) {
      if (Date.now() - t0 > 15000) break;
      try {
        const lock = await client.getMailboxLock(await mailboxName(client, folder));
        try {
          for (const r of rows) {
            if (Date.now() - t0 > 15000) break;
            const part: any = await client.fetchOne(String(r.uid), { source: { maxLength: 20000 } } as any, { uid: true }).catch(() => undefined);
            const snippet = part?.source ? await makeSnippet(part.source as Buffer) : "(Sin vista previa)";
            await prisma.email.update({ where: { id: r.id }, data: { snippet } });
          }
        } finally {
          lock.release();
        }
      } catch (e: any) {
        console.warn(`Relleno de vistas previas (${folder}):`, e?.message);
      }
    }
  };

  try {
    // La revisión rápida solo mira Recibidos, que es donde llega el correo nuevo
    for (const f of full ? FOLDERS : FOLDERS.slice(0, 1)) await syncFolder(f.names, f.db, f.max);
    await backfillSnippets();
  } finally {
    await client.logout().catch(() => {});
  }
  return { syncedCount, newInbox };
}
