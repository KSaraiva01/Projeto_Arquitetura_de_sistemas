import { z } from "zod";

/**
 * Mensagens padrão do Zod em português (as mensagens escritas à mão nos
 * schemas continuam valendo; isto cobre os casos genéricos, como
 * "campo obrigatório" ou "esperava texto").
 */
z.config(z.locales.ptBR());
