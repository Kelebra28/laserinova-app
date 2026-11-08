-- Agrega Task.completedAt (fecha en que la tarea pasó a DONE).
-- Relleno de las tareas ya terminadas: su fecha límite o, si no tiene, su fecha de creación
-- (no existe el dato real; "updatedAt" no sirve porque un reorden masivo la sobrescribió).
ALTER TABLE `Task` ADD COLUMN `completedAt` DATETIME(3) NULL;
UPDATE `Task` SET `completedAt` = COALESCE(`dueDate`, `createdAt`) WHERE `status` = 'DONE' AND `completedAt` IS NULL;
CREATE INDEX `Task_status_completedAt_idx` ON `Task`(`status`, `completedAt`);
