export type ReminderIntervalPreset = {
  key: string;
  label: string;
  minutesBefore: number;
  testOnly: boolean;
};

// Intervalos padrão oferecidos no painel. Para adicionar um novo intervalo no
// futuro, basta incluir mais um item aqui — nenhuma alteração de estrutura de
// banco é necessária (ReminderInterval.minutesBefore já é genérico).
export const REMINDER_INTERVAL_PRESETS: ReminderIntervalPreset[] = [
  { key: '48h', label: '48 horas antes', minutesBefore: 48 * 60, testOnly: false },
  { key: '24h', label: '24 horas antes', minutesBefore: 24 * 60, testOnly: false },
  { key: '2h', label: '2 horas antes', minutesBefore: 2 * 60, testOnly: false },
  // Intervalo curto para testar o envio sem esperar horas — só aparece no
  // painel quando o "modo de teste" da empresa está ativado.
  { key: 'test_5min', label: '5 minutos antes (teste)', minutesBefore: 5, testOnly: true },
];

export function getPresetByKey(key: string) {
  return REMINDER_INTERVAL_PRESETS.find((preset) => preset.key === key) ?? null;
}
