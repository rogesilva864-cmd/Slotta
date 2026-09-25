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
| `review_request` (opcional, só se usar o pedido de avaliação) | nome do cliente, nome da empresa, link de avaliação |
| `waitlist_available` (opcional, só se usar a lista de espera) | nome do cliente, nome da empresa, nome do serviço, data (dd/mm/aaaa), link para agendar |

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
WHATSAPP_TEMPLATE_REVIEW=review_request
WHATSAPP_TEMPLATE_WAITLIST=waitlist_available
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

## 4. Template opcional: pedido de avaliação

O pedido de avaliação depois do atendimento (aba **Lembretes** do painel) sempre
funciona por e-mail quando o cliente informou um. Para também enviar por
WhatsApp, crie um quarto template com o nome `review_request`, idioma
Português (BR), com três variáveis nesta ordem:

> Olá {{1}}! Obrigado por escolher a {{2}}. Sua opinião ajuda muito: avalie em menos de 1 minuto pelo link abaixo. {{3}}

Exemplos para a Meta: {{1}} = "Maria", {{2}} = "Barbearia JB", {{3}} = "https://g.page/r/ABC123/review".

Atenção: a Meta pode classificar esse template como **Marketing** (e não
Utility), o que muda o preço por mensagem e, em alguns casos, exige que o
cliente tenha aceitado receber esse tipo de contato. Enquanto ele não estiver
aprovado, o envio por WhatsApp falha (registrado como falha no painel) e só o
e-mail é enviado.

## Template opcional: aviso da lista de espera

Quando um horário abre em um dia que estava lotado, o cliente que entrou na
lista de espera é avisado por e-mail (se informou um) e, se você criar o
template abaixo, também por WhatsApp. Nome `waitlist_available`, idioma
Português (BR), cinco variáveis nesta ordem:

> Olá {{1}}! Você estava na lista de espera da {{2}} e um horário de {{3}} abriu para o dia {{4}}. Quem reservar primeiro garante a vaga: {{5}} Corra, esses horários costumam sair rápido!

A Meta não aceita variável no começo nem no fim do corpo do template, por isso a frase final depois da {{5}}.

Exemplos para a Meta: {{1}} = "Maria", {{2}} = "Barbearia JB", {{3}} = "Corte", {{4}} = "27/09/2026", {{5}} = "https://slotta.velyxon.com.br/agendar/barbearia-jb?data=2026-09-27".

Sem o template aprovado, o envio por WhatsApp falha e só o e-mail é enviado;
se nenhum canal funcionar, o painel avisa o dono para chamar o cliente
manualmente (aba **Lista de espera**).
