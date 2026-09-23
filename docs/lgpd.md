# LGPD — dados pessoais, retenção e exclusão (RNF-02)

Como o InfoHub cumpre a RNF-02 ("proteção de dados pessoais conforme a LGPD, incluindo consentimento no cadastro,
política de retenção e exclusão de dados"). A versão para o usuário final está na página `/privacidade`.

## Dados tratados e finalidade

| Dado | Onde | Para quê |
| --- | --- | --- |
| Nome, e-mail, telefone, curso, semestre | `usuarios` | Identificar a pessoa e falar com ela (e-mails da jornada) |
| Ideia, equipe, tarefas, entregas (arquivos e links), avaliações | `equipes`, `tarefas`, `entregas`, `anexos_entrega`, `comentarios_tarefa`, `UPLOADS_DIR` | Acompanhar a jornada até o InovAMF |
| Hash da senha (bcrypt) | `usuarios.senha_hash` | Login — a senha em si nunca é guardada |
| IP e navegador das sessões | `sessoes` | Segurança da conta (encerrar sessões, detectar reuso de token) |
| E-mails enviados (destino, assunto, corpo) | `notificacoes` | Fila de envio, reenvio em caso de falha e registro dos envios (RNF-05/06) |
| Ações relevantes (com IP) | `registros_auditoria` | Trilha de auditoria (RNF-05) |

**Base legal:** consentimento. O líder aceita a política no formulário de cadastro; o colega que o líder cadastra e as
contas criadas pela coordenação aceitam ao ativar a conta em `/definir-senha` (sem o aceite a API responde
`400 LGPD_CONSENT_REQUIRED`). A data do aceite fica em `usuarios.consentimento_lgpd_em`.

**Quem vê:** a própria equipe, os mentores dela e a coordenação — o escopo é aplicado em toda consulta (RNF-03). O
provedor de e-mail (Resend ou SMTP da faculdade) recebe só o necessário para entregar a mensagem. O InovAMF recebe os
materiais quando a coordenação encaminha a equipe.

## Retenção

A rotina agendada aplica a política uma vez por dia (`backend/src/jobs/retencao.ts`). Os prazos são configuráveis
(0 desliga aquela limpeza):

| O quê | Prazo padrão | Variável |
| --- | --- | --- |
| Sessões encerradas ou vencidas | 30 dias | `RETENTION_SESSIONS_DAYS` |
| Links de e-mail (ativação, recuperação, confirmação) usados ou vencidos | 30 dias | `RETENTION_TOKENS_DAYS` |
| Registros de acesso na auditoria (`LOGIN`, `LOGIN_FALHOU`, `LOGOUT`, `SESSAO_REUTILIZADA`) | 180 dias | `RETENTION_ACCESS_LOG_DAYS` |
| E-mails enviados (ou que desistiram de reenviar) | 365 dias | `RETENTION_NOTIFICATIONS_DAYS` |
| Backups | os `BACKUP_KEEP` mais recentes (14 por padrão, um por dia) | `BACKUP_KEEP` |
| Equipe, tarefas, entregas e histórico | enquanto a equipe estiver no programa | — |

E-mails que ainda vão ser (re)enviados nunca são apagados pela retenção. O histórico de negócio (mudanças de etapa,
avaliações) é a trilha de auditoria do RNF-05 e fica enquanto a equipe existir; uma equipe excluída (Q4) sai das telas
e fica só para consulta da coordenação.

## Exclusão dos dados (direito do titular)

- **Pela própria pessoa:** *Minha conta → Excluir minha conta* (`DELETE /api/auth/me`, confirmando a senha).
- **Pela coordenação:** *Usuários → Excluir os dados* (`DELETE /api/users/:id`), para pedidos recebidos por outros canais.

O que acontece (`anonimizarUsuario`, em uma transação):

1. Nome vira "Usuário removido"; e-mail, telefone, curso, semestre e senha são apagados; a conta fica inativa com
   `excluido_em`. A linha continua existindo para o histórico não perder a referência (entregas, comentários).
2. Sessões, links de e-mail e preferências de aviso são apagados.
3. E-mails para a pessoa que ainda não saíram são descartados; os que saíram perdem endereço e conteúdo.
4. O nome completo some dos e-mails enviados a outras pessoas (ex.: "Fulano enviou a versão 2").
5. O e-mail sai dos detalhes da auditoria e o IP sai das ações da pessoa.
6. Nas equipes: a pessoa sai; se era **líder**, o integrante ativo mais antigo assume (Q1: um líder por equipe); se
   era o único integrante, a equipe é excluída logicamente. Mentorias são removidas.

O que fica, sem identificar a pessoa: o que a equipe produziu (arquivos e textos das entregas, comentários) — é
trabalho da equipe, não dado pessoal. O último administrador ativo não pode ser excluído.

**Backups:** a exclusão vale imediatamente no banco; os backups anteriores ao pedido deixam de existir quando saem da
janela de `BACKUP_KEEP` (14 dias por padrão). Uma restauração nesse período precisa repetir a exclusão.

## Segurança

- Senhas com bcrypt; tokens de e-mail de uso único, com validade, guardados só como hash — e o token também sai do
  corpo do e-mail registrado em `notificacoes` assim que o e-mail é enviado.
- Arquivos das entregas fora da pasta pública, baixados só pela API, com login e escopo (RNF-04).
- Conta desativada ou excluída perde o acesso na hora (o usuário é relido a cada requisição).
- Backups (`BACKUP_DIR`) contêm dados pessoais e hashes de senha: o volume não pode ser público.
