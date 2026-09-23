import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InfoHubLogo from "@/components/InfoHubLogo";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Política de privacidade — InfoHub",
};

/**
 * RNF-02 — política de privacidade e de retenção (LGPD), a que o formulário
 * de cadastro e a ativação da conta pedem aceite. Os prazos são os padrões da
 * rotina de retenção (docs/lgpd.md).
 */
const SECOES: Array<{ titulo: string; itens: React.ReactNode[] }> = [
  {
    titulo: "Quem trata os seus dados",
    itens: [
      "O InfoHub é o laboratório de ideias da Faculdade Antonio Meneghetti (AMF). A coordenação do InfoHub é a responsável pelos dados tratados neste sistema.",
    ],
  },
  {
    titulo: "Quais dados coletamos",
    itens: [
      "Identificação e contato: nome, e-mail, telefone/WhatsApp, curso e semestre.",
      "A ideia e a equipe: nome e descrição da ideia, área, estágio, integrantes, tarefas, arquivos e links entregues e as avaliações recebidas.",
      "Uso do sistema: data e IP dos acessos, sessões abertas e os e-mails que o sistema enviou a você.",
      "A senha nunca é guardada: guardamos só um resumo criptográfico (hash) dela.",
    ],
  },
  {
    titulo: "Para que usamos",
    itens: [
      "Acompanhar a jornada da equipe até o InovAMF: tarefas, prazos, entregas, avaliações e mudanças de etapa.",
      "Enviar os avisos da jornada por e-mail (nova tarefa, prazos, avaliações, lembretes).",
      "Gerar os relatórios da coordenação sobre o programa.",
      "A base legal é o seu consentimento, dado no cadastro da ideia ou na ativação da conta.",
    ],
  },
  {
    titulo: "Quem vê os seus dados",
    itens: [
      "Os integrantes da sua equipe, os mentores dela e a coordenação do InfoHub. Anotações internas dos mentores não são mostradas aos alunos.",
      "O serviço de envio de e-mails, só para entregar as mensagens.",
      "O centro de inovação InovAMF, quando a coordenação encaminha a sua equipe para lá ao fim da jornada.",
    ],
  },
  {
    titulo: "Por quanto tempo guardamos",
    itens: [
      "Dados da equipe, tarefas, entregas e histórico: enquanto a equipe fizer parte do programa. Uma equipe excluída sai das telas, mas o histórico fica para a coordenação.",
      "Sessões de acesso: 30 dias depois de encerradas ou vencidas.",
      "Links enviados por e-mail (ativação, recuperação, confirmação): 30 dias depois de usados ou vencidos.",
      "Registros de acesso (login e saída, com IP): 6 meses.",
      "Cópias dos e-mails enviados: 12 meses.",
      "Backups: uma cópia por dia, guardada por 14 dias. Depois de uma exclusão, os dados deixam de existir também nos backups ao fim desse prazo.",
    ],
  },
  {
    titulo: "Os seus direitos",
    itens: [
      "Consultar e corrigir os seus dados: eles aparecem na sua área do sistema; para corrigir algo, fale com a coordenação ou com o líder da equipe.",
      <>
        Excluir a sua conta: em <strong>Minha conta → Excluir minha conta</strong>. Nome, e-mail, telefone, curso, senha
        e sessões são apagados e o seu nome some dos e-mails já enviados. Se você for o líder, outro integrante assume a
        liderança; se for o único integrante, a equipe é excluída. O que a equipe produziu (entregas, comentários)
        continua com ela, sem o seu nome.
      </>,
      "Deixar de receber avisos por e-mail: em Minha conta → Avisos por e-mail (os e-mails de segurança da conta continuam).",
      "Revogar o consentimento: é o mesmo que excluir a conta.",
    ],
  },
  {
    titulo: "Segurança",
    itens: [
      "Cada perfil vê só o que é dele: o aluno, a própria equipe; o mentor, as equipes que acompanha; a coordenação, o programa inteiro.",
      "Os arquivos das entregas só são baixados por quem está logado e tem acesso à equipe.",
      "Mudanças de etapa, avaliações e envios de e-mail ficam registrados numa trilha de auditoria.",
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-card-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Voltar ao início" className="text-muted-light hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <InfoHubLogo size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Política de privacidade</h1>
        <p className="text-muted mb-8">
          Como o InfoHub trata os dados pessoais de alunos, mentores e coordenação, conforme a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018).
        </p>

        <div className="space-y-6">
          {SECOES.map((secao) => (
            <section key={secao.titulo} className="bg-card rounded-xl border border-card-border p-6">
              <h2 className="text-base font-semibold text-foreground mb-3">{secao.titulo}</h2>
              <ul className="space-y-2 list-disc pl-5 text-sm text-muted marker:text-muted-light">
                {secao.itens.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-light">
          Dúvidas ou pedidos sobre os seus dados: procure a coordenação do InfoHub na Faculdade Antonio Meneghetti.
        </p>
      </main>
    </div>
  );
}
