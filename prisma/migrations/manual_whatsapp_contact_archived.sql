-- Chats archivados: el bot no contesta, no hay avisos y salen de la bandeja principal.
ALTER TABLE `WhatsAppContact` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;
