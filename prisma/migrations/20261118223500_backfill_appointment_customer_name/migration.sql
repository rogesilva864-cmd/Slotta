-- Agendamentos criados antes de existir Appointment.customerName caíam no
-- Customer.name, que muda a cada novo agendamento do mesmo telefone. Congela
-- o nome atual neles para que deixem de ser renomeados.
UPDATE "Appointment"
SET "customerName" = (SELECT "name" FROM "Customer" WHERE "Customer"."id" = "Appointment"."customerId")
WHERE "customerName" IS NULL;
