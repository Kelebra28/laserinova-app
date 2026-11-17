-- Estados de cuenta bancarios: se guardan los datos leídos (cuenta, periodo, saldos y movimientos), nunca el PDF.
-- Solo agrega tablas nuevas; no toca ninguna existente.
CREATE TABLE IF NOT EXISTS `BankStatement` (
  `id` VARCHAR(191) NOT NULL,
  `bank` VARCHAR(191) NOT NULL,
  `product` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `accountLast4` VARCHAR(191) NOT NULL,
  `holder` VARCHAR(191) NULL,
  `periodFrom` DATE NOT NULL,
  `periodTo` DATE NOT NULL,
  `openingBalance` DOUBLE NULL,
  `closingBalance` DOUBLE NULL,
  `checks` JSON NOT NULL,
  `warnings` JSON NOT NULL,
  `fileName` VARCHAR(191) NULL,
  `uploadedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `BankStatement_accountId_periodFrom_periodTo_key`(`accountId`, `periodFrom`, `periodTo`),
  INDEX `BankStatement_accountId_idx`(`accountId`),
  INDEX `BankStatement_periodTo_idx`(`periodTo`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `BankMovement` (
  `id` VARCHAR(191) NOT NULL,
  `statementId` VARCHAR(191) NOT NULL,
  `fingerprint` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DOUBLE NOT NULL,
  `balance` DOUBLE NULL,
  `state` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
  `transactionId` VARCHAR(191) NULL,
  UNIQUE INDEX `BankMovement_statementId_fingerprint_key`(`statementId`, `fingerprint`),
  INDEX `BankMovement_state_idx`(`state`),
  INDEX `BankMovement_date_idx`(`date`),
  PRIMARY KEY (`id`),
  CONSTRAINT `BankMovement_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `BankStatement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
