import { ImapFlow } from "imapflow";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

/**
 * Operaciones contra el servidor IMAP (mover, marcar leído/destacado), para que el estado del CRM
 * y el del buzón sean el mismo: si no, un correo movido a Papelera "reaparecía" en Recibidos al
 * sincronizar y el que se abría ya movido se buscaba en la carpeta equivocada.
 */

// Nombres que usan los proveedores para cada carpeta (Hostinger usa INBOX.Sent, etc.).
export const FOLDER_CANDIDATES: Record<string, string[]> = {
  INBOX: ["INBOX"],
  SENT: ["INBOX.Sent", "Sent", "Sent Messages", "Enviados"],
  SPAM: ["INBOX.Junk", "Junk", "Spam", "INBOX.Spam", "Correo no deseado"],
  TRASH: ["INBOX.Trash", "Trash", "Deleted Messages", "Papelera"],
};
const SPECIAL_USE: Record<string, string> = { SENT: "\\Sent", SPAM: "\\Junk", TRASH: "\\Trash" };

export async function getImapConfig(userId: string) {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  let user = dbUser?.email || "";
  let pass = "";
  let host = dbUser?.emailIncomingServer || "imap.hostinger.com";
  if (dbUser?.emailPasswordEncrypted) {
    try {
      pass = decrypt(dbUser.emailPasswordEncrypted);
    } catch {
      /* se usa el buzón global */
    }
  }
  if (!pass) {
    user = process.env.SMTP_USER || "";
    pass = process.env.SMTP_PASS || "";
    host = process.env.SMTP_HOST?.replace("smtp", "imap") || "imap.hostinger.com";
  }
  return user && pass ? { host, user, pass } : null;
}

export async function withImap<T>(userId: string, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const cfg = await getImapConfig(userId);
  if (!cfg) throw new Error("No hay credenciales de correo configuradas.");
  const client = new ImapFlow({
    host: cfg.host,
    port: 993,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
    connectionTimeout: 8000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => {});
  }
}

/** Nombre real de la carpeta en el servidor: primero por su rol (\Sent, \Trash…) y luego por nombres comunes. */
export async function mailboxName(client: ImapFlow, dbFolder: string): Promise<string> {
  if (dbFolder === "INBOX") return "INBOX";
  const boxes = await client.list();
  const bySpecial = boxes.find((b) => b.specialUse === SPECIAL_USE[dbFolder]);
  if (bySpecial) return bySpecial.path;
  const paths = boxes.map((b) => b.path);
  for (const cand of FOLDER_CANDIDATES[dbFolder] || []) {
    const hit = paths.find((p) => p.toLowerCase() === cand.toLowerCase());
    if (hit) return hit;
  }
  throw new Error(`No se encontró la carpeta ${dbFolder} en el servidor de correo.`);
}

type EmailRef = { folder: string; uid: number | null; messageId: string };

/** Marca o quita \Seen / \Flagged en el servidor. */
export async function imapSetFlag(userId: string, email: EmailRef, flag: "\\Seen" | "\\Flagged", on: boolean) {
  if (!email.uid || email.uid < 0) return;
  await withImap(userId, async (client) => {
    const lock = await client.getMailboxLock(await mailboxName(client, email.folder));
    try {
      if (on) await client.messageFlagsAdd(String(email.uid), [flag], { uid: true });
      else await client.messageFlagsRemove(String(email.uid), [flag], { uid: true });
    } finally {
      lock.release();
    }
  });
}

/** Mueve el correo a otra carpeta del servidor y devuelve su UID nuevo (cambia al moverse). */
export async function imapMove(userId: string, email: EmailRef, toFolder: string): Promise<number | null> {
  if (!email.uid || email.uid < 0) return null;
  const uid = email.uid;
  return withImap(userId, async (client) => {
    const from = await mailboxName(client, email.folder);
    const dest = await mailboxName(client, toFolder);
    let newUid: number | undefined;
    const lock = await client.getMailboxLock(from);
    try {
      const res = await client.messageMove(String(uid), dest, { uid: true });
      newUid = res && typeof res === "object" ? (res.uidMap?.get(uid) as number | undefined) : undefined;
    } finally {
      lock.release();
    }
    if (newUid) return newUid;
    // El servidor no devolvió el mapa de UIDs: se busca el correo en el destino por su Message-ID.
    const lock2 = await client.getMailboxLock(dest);
    try {
      const found = await client.search({ header: { "message-id": email.messageId } }, { uid: true });
      return Array.isArray(found) && found.length ? Math.max(...found) : null;
    } finally {
      lock2.release();
    }
  });
}
