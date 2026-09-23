-- RNF-02 (LGPD): o aceite da política de privacidade passa a ser da própria pessoa.
-- O colega cadastrado pelo líder (e a conta criada pela coordenação) aceita ao ativar
-- a conta pelo link do e-mail. As contas ainda não ativadas tinham o aceite gravado
-- em nome delas no cadastro; ele é removido e será pedido na ativação.
UPDATE "usuarios" SET "consentimento_lgpd_em" = NULL
WHERE "senha_hash" IS NULL AND "excluido_em" IS NULL;
