import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { applyStripeEvent, getStripeClient } from '@/lib/billing';

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ message: 'Stripe não configurado.' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ message: 'Assinatura ausente.' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] Assinatura inválida:', error);
    return NextResponse.json({ message: 'Assinatura inválida.' }, { status: 400 });
  }

  try {
    await applyStripeEvent(event);
  } catch (error) {
    console.error('[stripe-webhook] Erro ao processar evento:', event.type, error);
  }

  return NextResponse.json({ received: true });
}
