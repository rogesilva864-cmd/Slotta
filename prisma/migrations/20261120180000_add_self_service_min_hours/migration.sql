-- Prazo mínimo para o cliente cancelar/remarcar sozinho. 0 = sem limite, que é
-- o comportamento de antes: nenhuma empresa existente muda.
ALTER TABLE "Company" ADD COLUMN "selfServiceMinHours" INTEGER NOT NULL DEFAULT 0;
