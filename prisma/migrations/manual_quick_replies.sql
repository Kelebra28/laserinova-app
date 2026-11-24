-- Respuestas rápidas del chat de WhatsApp (atajos "/direccion", "/cuenta", etc.).
-- Si la tabla no existe el chat funciona igual, solo sin el botón de respuestas rápidas.
CREATE TABLE IF NOT EXISTS `QuickReply` (
  `id` VARCHAR(191) NOT NULL,
  `shortcut` VARCHAR(40) NOT NULL,
  `title` VARCHAR(80) NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `QuickReply_shortcut_key` (`shortcut`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
