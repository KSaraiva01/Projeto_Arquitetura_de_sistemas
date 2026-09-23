-- Segurança: o link dos e-mails de ativação, recuperação e confirmação leva o token em claro,
-- e `tokens_usuario` guarda só o hash dele. A partir de agora o serviço tira o token do corpo
-- do e-mail assim que ele sai (ou quando desiste de reenviar); esta migration faz o mesmo com
-- os e-mails que já tinham saído. Os que ainda vão ser (re)enviados ficam como estão.
UPDATE "notificacoes"
SET "corpo" = regexp_replace("corpo", 'token=[^"&<[:space:]]+', 'token=[removido]', 'g')
WHERE "tipo" IN ('ATIVACAO_CONTA', 'RECUPERACAO_SENHA', 'CONFIRMACAO_EMAIL')
  AND ("status" = 'ENVIADA' OR ("status" = 'FALHOU' AND "proximo_envio_em" IS NULL));
