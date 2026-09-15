import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { REMINDER_INTERVAL_PRESETS, getOrCreateReminderSetting, getPresetByKey } from '@/lib/reminders/service';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const setting = await getOrCreateReminderSetting(sessionUser.companyId);

  return NextResponse.json({
    enabled: setting.enabled,
    testMode: setting.testMode,
    intervals: setting.intervals.map((interval) => ({
      key: interval.key,
      label: interval.label,
      minutesBefore: interval.minutesBefore,
      active: interval.active,
      testOnly: REMINDER_INTERVAL_PRESETS.find((preset) => preset.key === interval.key)?.testOnly ?? false,
    })),
    availablePresets: REMINDER_INTERVAL_PRESETS,
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const setting = await getOrCreateReminderSetting(sessionUser.companyId);

    const data: { enabled?: boolean; testMode?: boolean } = {};
    if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
    if (typeof body.testMode === 'boolean') data.testMode = body.testMode;

    if (Object.keys(data).length > 0) {
      await prisma.reminderSetting.update({ where: { id: setting.id }, data });
    }

    if (Array.isArray(body.intervals)) {
      for (const item of body.intervals) {
        const key = typeof item?.key === 'string' ? item.key : null;
        const active = Boolean(item?.active);
        if (!key) continue;

        const preset = getPresetByKey(key);
        if (!preset) continue; // ignora chaves desconhecidas

        await prisma.reminderInterval.upsert({
          where: { reminderSettingId_key: { reminderSettingId: setting.id, key } },
          update: { active },
          create: {
            reminderSettingId: setting.id,
            key: preset.key,
            label: preset.label,
            minutesBefore: preset.minutesBefore,
            active,
          },
        });
      }
    }

    const updated = await prisma.reminderSetting.findUnique({
      where: { id: setting.id },
      include: { intervals: true },
    });

    return NextResponse.json({
      message: 'Configurações de lembretes salvas.',
      enabled: updated!.enabled,
      testMode: updated!.testMode,
      intervals: updated!.intervals.map((interval) => ({
        key: interval.key,
        label: interval.label,
        minutesBefore: interval.minutesBefore,
        active: interval.active,
        testOnly: REMINDER_INTERVAL_PRESETS.find((preset) => preset.key === interval.key)?.testOnly ?? false,
      })),
    });
  } catch (error) {
    console.error('[admin/reminders/settings] erro:', error);
    return NextResponse.json({ message: 'Não foi possível salvar as configurações.' }, { status: 500 });
  }
}
