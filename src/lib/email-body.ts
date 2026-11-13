import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { loadEmailFromDisk } from "@/lib/emailStorage";
import { withImap, mailboxName } from "@/lib/email-imap";
import { stripHtml } from "@/lib/email-snippet";

/** Texto plano de un correo: del disco si ya se abrió alguna vez; si no, del servidor IMAP. */
export async function getEmailText(
  userId: string,
  email: { id: string; folder: string; uid: number | null; storagePath: string | null; snippet: string | null }
): Promise<string> {
  if (email.storagePath) {
    const disk = loadEmailFromDisk(email.storagePath);
    const t = disk.text || (disk.html ? stripHtml(disk.html) : "");
    if (t.trim()) return t;
  }
  if (email.uid && email.uid > 0) {
    try {
      const text = await withImap(userId, async (client) => {
        const lock = await client.getMailboxLock(await mailboxName(client, email.folder));
        try {
          const part: any = await client.fetchOne(String(email.uid), { source: true } as any, { uid: true });
          if (!part?.source) return "";
          const parsed = await simpleParser(part.source as Buffer);
          return parsed.text || (typeof parsed.html === "string" ? stripHtml(parsed.html) : "");
        } finally {
          lock.release();
        }
      });
      if (text.trim()) return text;
    } catch (e: any) {
      console.warn("getEmailText IMAP:", e?.message);
    }
  }
  const row = await prisma.email.findUnique({ where: { id: email.id }, select: { snippet: true } });
  return row?.snippet || "";
}
