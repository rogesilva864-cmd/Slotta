import { createRemindersForAppointment, sendAppointmentConfirmedMessage } from '@/lib/reminders/service';

/**
 * O que acontece logo depois de um agendamento virar CONFIRMED, seja pelo dono
 * (botão Confirmar) ou automaticamente (empresa com autoConfirm): agenda os
 * lembretes e manda a confirmação por WhatsApp. Best-effort: nunca lança.
 */
export async function runAfterConfirmation(appointmentId: string) {
  await createRemindersForAppointment(appointmentId).catch((error) => {
    console.error('[appointments/confirm] Falha ao criar lembretes:', error);
  });
  await sendAppointmentConfirmedMessage(appointmentId).catch((error) => {
    console.error('[appointments/confirm] Falha ao enviar confirmação:', error);
  });
}
