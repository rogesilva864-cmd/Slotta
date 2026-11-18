/**
 * Nome a mostrar/enviar para um agendamento: o que foi digitado nele, ou —
 * nos agendamentos anteriores a esse campo — o nome atual do cliente.
 */
export function bookingName(appointment: { customerName?: string | null; customer: { name: string } }) {
  return appointment.customerName?.trim() || appointment.customer.name;
}

/**
 * Para respostas ao painel/consulta: devolve o agendamento com
 * `customer.name` já trocado pelo nome deste agendamento, assim as telas
 * continuam lendo `appointment.customer.name`.
 */
export function withBookingName<T extends { customerName?: string | null; customer: { name: string } }>(appointment: T): T {
  return { ...appointment, customer: { ...appointment.customer, name: bookingName(appointment) } };
}
