# Configurar WhatsApp de verdade (Meta Cloud API)

Sem nenhuma variável configurada, o sistema de lembretes funciona
normalmente (cria os lembretes, processa, marca como enviado), mas as
mensagens só são registradas no log do servidor — ninguém recebe nada no
WhatsApp de verdade. Isso é intencional: permite desenvolver e testar todo o
fluxo sem depender de credenciais externas.

Para envio real, o Slotta já vem pronto para a **API oficial do WhatsApp**
(Meta Cloud API). Veja exatamente o que você precisa:

## 1. Criar o app e obter as credenciais

1. Crie (ou use) uma conta em https://business.facebook.com.
2. Em https://developers.facebook.com/apps, crie um app do tipo **Business**.
3. Adicione o produto **WhatsApp** ao app.
4. No painel do WhatsApp do app, você verá:
   - Um **número de telefone de teste** já disponível (para testar antes de usar um número real).
   - O **Phone Number ID** desse número — é o valor de `WHATSAPP_PHONE_NUMBER_ID`.
   - Um **token de acesso temporário** (válido por 24h) — bom para testar rápido, mas não para produção.
5. Para produção, gere um **token de acesso permanente**: em **System Users** (Configurações do Negócio → Usuários do sistema), crie um usuário de sistema, gere um token com a permissão `whatsapp_business_messaging`, e use esse valor em `WHATSAPP_API_TOKEN`.

## 2. Aprovar os templates de mensagem

Mensagens que a empresa inicia (confirmação, lembrete, cancelamento — ou
seja, todo o fluxo do Slotta) **exigem um template pré-aprovado** pela Meta.
Não é possível mandar texto livre fora de uma conversa iniciada pelo
cliente nas últimas 24h.

No WhatsApp Manager, crie 3 templates (categoria **Utility**), com
variáveis numeradas `{{1}}`, `{{2}}`, ... **exatamente nessa ordem**:

| Template | Variáveis, em ordem |
|---|---|
| `appointment_confirmed` | nome do cliente, nome da empresa, nome do serviço, data, horário |
| `appointment_reminder` | nome do cliente, nome da empresa, nome do serviço, data, horário, "faltam X" |
| `appointment_cancelled` | nome do cliente, nome da empresa, nome do serviço, data, horário, motivo |

Exemplo de corpo para `appointment_reminder`:

> Olá {{1}}! Passando para lembrar do seu horário na {{2}}. Serviço: {{3}}, dia {{4}} às {{5}}. {{6}}.

Depois de aprovados (normalmente em minutos a poucas horas), os nomes dos
templates vão nas variáveis `WHATSAPP_TEMPLATE_CONFIRMED`,
`WHATSAPP_TEMPLATE_REMINDER` e `WHATSAPP_TEMPLATE_CANCELLED` — use o nome
exato que você deu ao template.

Se quiser mudar a ordem ou o texto, ajuste também
`lib/whatsapp/providers/meta-cloud-provider.ts` (`TEMPLATE_PARAMETER_ORDER`)
para bater com o que foi aprovado.

## 3. Variáveis de ambiente

No `.env` (local) ou nas Variables do Railway (produção):

```
WHATSAPP_PROVIDER=meta
WHATSAPP_API_TOKEN=<token permanente do usuário de sistema>
WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID>
WHATSAPP_API_VERSION=v20.0
WHATSAPP_TEMPLATE_LANG=pt_BR
WHATSAPP_TEMPLATE_CONFIRMED=appointment_confirmed
WHATSAPP_TEMPLATE_REMINDER=appointment_reminder
WHATSAPP_TEMPLATE_CANCELLED=appointment_cancelled
```

Sem `WHATSAPP_PROVIDER=meta`, o sistema continua no modo de log (nenhuma
mensagem real é enviada) mesmo que as outras variáveis estejam preenchidas.

## 4. Testar

1. Ative "Lembretes por WhatsApp" no painel da empresa (aba **Lembretes**).
2. Ligue o **modo de teste** — libera um intervalo de poucos minutos.
3. Confirme um agendamento cujo horário seja daqui a mais de alguns minutos.
4. Clique em **Processar agora** (ou espere o worker automático, que roda a
   cada 60s por padrão) e confira o status do lembrete na lista.

## 5. Trocar de provedor no futuro

Toda a lógica do Slotta chama apenas `sendWhatsappMessage(...)` de
`lib/whatsapp`. Para usar outro provedor (Twilio, Z-API, etc.), crie uma
nova classe em `lib/whatsapp/providers/` implementando a interface
`WhatsappProvider` e registre-a em `lib/whatsapp/index.ts` — nenhum outro
arquivo do projeto precisa mudar.
