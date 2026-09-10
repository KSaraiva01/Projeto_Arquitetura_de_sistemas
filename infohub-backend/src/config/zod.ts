import { z } from "zod";

/**
 * Coloca as mensagens padrão do Zod em português.
 *
 * Sem isso, um campo obrigatório ausente devolveria "Invalid input: expected
 * string, received undefined" — que iria direto para a tela do aluno. As
 * mensagens escritas à mão nos schemas continuam tendo prioridade.
 *
 * Este módulo precisa ser importado antes de qualquer schema ser usado; o
 * `app.ts` faz isso logo no topo.
 */
z.config(z.locales.ptBR());
