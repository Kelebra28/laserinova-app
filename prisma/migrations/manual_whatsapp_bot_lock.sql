-- Candado del bot de WhatsApp: evita que dos respuestas del bot corran a la vez para el mismo
-- contacto (avisos duplicados al equipo y errores de Gemini por historial encimado).
-- Si la tabla no existe el bot sigue funcionando, solo que sin candado.
CREATE TABLE IF NOT EXISTS `WhatsAppBotLock` (
  `contactId` VARCHAR(191) NOT NULL,
  `lockedUntil` DATETIME(3) NOT NULL,
  PRIMARY KEY (`contactId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
