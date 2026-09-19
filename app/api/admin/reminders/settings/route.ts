import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { REMINDER_INTERVAL_PRESETS, getOrCreateReminderSetting, getPresetByKey } from '@/lib/reminders/service';
import { REVIEW_DELAY_OPTIONS, getReviewStats, isValidReviewDelay, isValidReviewUrl } from '@/lib/reviews/service';

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
    review: {
      enabled: setting.reviewEnabled,
      url: setting.reviewUrl ?? '',
      delayMinutes: setting.reviewDelayMinutes,
      delayOptions: REVIEW_DELAY_OPTIONS,
      stats: await getReviewStats(sessionUser.companyId),
    },
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

    const data: { enabled?: boolean; testMode?: boolean; reviewEnabled?: boolean; reviewUrl?: string | null; reviewDelayMinutes?: number } = {};
    if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
    if (typeof body.testMode === 'boolean') data.testMode = body.testMode;

    if (body.review && typeof body.review === 'object') {
      const review = body.review as { enabled?: unknown; url?: unknown; delayMinutes?: unknown };

      if (typeof review.url === 'string') {
        const url = review.url.trim();
        if (url && !isValidReviewUrl(url)) {
          return NextResponse.json({ message: 'O link de avaliação precisa começar com https:// e ser um endereço válido.' }, { status: 400 });
        }
        data.reviewUrl = url || null;
      }
      if (typeof review.delayMinutes === 'number') {
        if (!isValidReviewDelay(review.delayMinutes)) {
          return NextResponse.json({ message: 'Tempo de espera inválido.' }, { status: 400 });
        }
        data.reviewDelayMinutes = review.delayMinutes;
      }
      if (typeof review.enabled === 'boolean') {
        const finalUrl = data.reviewUrl !== undefined ? data.reviewUrl : setting.reviewUrl;
        if (review.enabled && !finalUrl) {
          return NextResponse.json({ message: 'Informe o link de avaliação antes de ativar.' }, { status: 400 });
        }
        data.reviewEnabled = review.enabled;
      }
    }

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
