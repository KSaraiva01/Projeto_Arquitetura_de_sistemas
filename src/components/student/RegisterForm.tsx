// Formulário de inscrição do aluno (Etapa 1 – Envio da ideia)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AREAS, SEMESTERS } from "../../data/mockData";
import type { AuthState } from "../../types";

interface Props {
  onLoginAfterRegister: (auth: AuthState) => void; // loga o aluno automaticamente após inscrever
}

interface MemberRow {
  id: string;
  name: string;
  course: string;
}

export default function RegisterForm({ onLoginAfterRegister }: Props) {
  const navigate = useNavigate();
  const onBack = () => navigate("/login");

  // Inscrição concluída: loga o aluno automaticamente e vai para o portal
  function onSubmit() {
    onLoginAfterRegister({
      role: "student",
      name: "Novo Aluno",
      email: "novo@amf.edu.br",
      teamId: "t1", // demo: usa equipe de exemplo
    });
    navigate("/student", { replace: true });
  }
  // Dados do líder
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");

  // Membros adicionais
  const [members, setMembers] = useState<MemberRow[]>([]);

  // Dados do projeto
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [ideaStage, setIdeaStage] = useState("");
  const [source, setSource] = useState("");

  // UI state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);

  function addMember() {
    setMembers((m) => [...m, { id: Date.now().toString(), name: "", course: "" }]);
  }

  function updateMember(id: string, field: "name" | "course", value: string) {
    setMembers((m) => m.map((mb) => (mb.id === id ? { ...mb, [field]: value } : mb)));
  }

  function removeMember(id: string) {
    setMembers((m) => m.filter((mb) => mb.id !== id));
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório";
    if (!email.trim() || !email.includes("@")) e.email = "E-mail válido obrigatório";
    if (!phone.trim()) e.phone = "Telefone obrigatório";
    if (!course.trim()) e.course = "Curso obrigatório";
    if (!semester) e.semester = "Selecione o semestre";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!projectName.trim()) e.projectName = "Nome do projeto obrigatório";
    if (description.trim().length < 20) e.description = "Descreva a ideia com pelo menos 20 caracteres";
    if (!area) e.area = "Selecione a área";
    if (!ideaStage) e.ideaStage = "Selecione o estágio";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function handleSubmit() {
    if (!consent) {
      setErrors({ consent: "Você precisa aceitar os termos para prosseguir." });
      return;
    }
    setSubmitted(true);
    setTimeout(onSubmit, 2200);
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none";
  const inputStyle = { borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" };
  const labelStyle = { color: "var(--foreground)" };
  const errStyle = { color: "var(--danger)", fontSize: "0.75rem", marginTop: "0.25rem" };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
        <div className="max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "#ecfdf5" }}
          >
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--success)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Ideia enviada!
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Sua inscrição foi recebida com sucesso. A equipe InfoHub irá analisar sua proposta e entrar em contato em breve pelo e-mail <strong>{email}</strong>.
          </p>
          <p className="text-xs mt-4" style={{ color: "var(--muted-foreground)" }}>
            Redirecionando para seu painel...
          </p>
          <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
            <div
              className="h-full rounded-full"
              style={{ background: "var(--success)", width: "100%", transition: "width 2s linear" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Topbar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            IH
          </div>
          <span className="font-display font-semibold text-base" style={{ color: "var(--sidebar)" }}>
            InfoHub — Inscrição
          </span>
        </div>
        <button
          onClick={onBack}
          className="text-sm hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Voltar ao login
        </button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10">
        {/* Progress steps */}
        <div className="flex items-center gap-3 mb-8">
          {[
            { n: 1, label: "Seus dados" },
            { n: 2, label: "Sua ideia" },
            { n: 3, label: "Confirmação" },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: step > n ? "var(--success)" : step === n ? "var(--primary)" : "var(--muted)",
                  color: step >= n ? "#fff" : "var(--muted-foreground)",
                }}
              >
                {step > n ? "✓" : n}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: step === n ? "var(--primary)" : "var(--muted-foreground)" }}
              >
                {label}
              </span>
              {i < 2 && (
                <div
                  className="flex-1 h-px"
                  style={{ background: step > n ? "var(--success)" : "var(--border)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: dados do líder ── */}
        {step === 1 && (
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              Seus dados
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
              Preencha com os dados do responsável pela inscrição (líder da equipe).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Nome completo *</label>
                <input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="João da Silva" />
                {errors.name && <p style={errStyle}>{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>E-mail *</label>
                  <input type="email" className={inputClass} style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@amf.edu.br" />
                  {errors.email && <p style={errStyle}>{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Telefone/WhatsApp *</label>
                  <input className={inputClass} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(55) 99999-9999" />
                  {errors.phone && <p style={errStyle}>{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Curso *</label>
                  <input className={inputClass} style={inputStyle} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Administração" />
                  {errors.course && <p style={errStyle}>{errors.course}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Semestre *</label>
                  <select className={inputClass} style={inputStyle} value={semester} onChange={(e) => setSemester(e.target.value)}>
                    <option value="">Selecione</option>
                    {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.semester && <p style={errStyle}>{errors.semester}</p>}
                </div>
              </div>

              {/* Integrantes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium" style={labelStyle}>Integrantes da equipe (opcional)</label>
                  <button
                    type="button"
                    onClick={addMember}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: "var(--secondary)", color: "var(--primary)" }}
                  >
                    + Adicionar
                  </button>
                </div>
                {members.length === 0 && (
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    Pode preencher agora ou depois no painel.
                  </p>
                )}
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex gap-2">
                      <input
                        className={`${inputClass} flex-1`}
                        style={inputStyle}
                        placeholder="Nome do colega"
                        value={m.name}
                        onChange={(e) => updateMember(m.id, "name", e.target.value)}
                      />
                      <input
                        className={`${inputClass} w-40`}
                        style={inputStyle}
                        placeholder="Curso"
                        value={m.course}
                        onChange={(e) => updateMember(m.id, "course", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        className="px-2 rounded-lg text-sm"
                        style={{ color: "var(--danger)" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="mt-6 w-full py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              Próximo →
            </button>
          </div>
        )}

        {/* ── Step 2: dados da ideia ── */}
        {step === 2 && (
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              Sua ideia
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
              Não precisa ser perfeita — uma ideia crua é bem-vinda!
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Nome do projeto / ideia *</label>
                <input className={inputClass} style={inputStyle} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Ex.: EcoRaízes" />
                {errors.projectName && <p style={errStyle}>{errors.projectName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Descrição inicial *</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva brevemente o problema que você quer resolver e como pretende resolvê-lo..."
                />
                <div className="flex justify-between mt-0.5">
                  {errors.description ? <p style={errStyle}>{errors.description}</p> : <span />}
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {description.length} caracteres
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Área / setor *</label>
                  <select className={inputClass} style={inputStyle} value={area} onChange={(e) => setArea(e.target.value)}>
                    <option value="">Selecione</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {errors.area && <p style={errStyle}>{errors.area}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Estágio atual *</label>
                  <select className={inputClass} style={inputStyle} value={ideaStage} onChange={(e) => setIdeaStage(e.target.value)}>
                    <option value="">Selecione</option>
                    {["Apenas ideia", "Protótipo", "MVP em desenvolvimento", "MVP pronto"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.ideaStage && <p style={errStyle}>{errors.ideaStage}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Como conheceu o InfoHub? (opcional)</label>
                <select className={inputClass} style={inputStyle} value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="">Selecione</option>
                  {["Redes sociais", "Indicação de professor", "Indicação de colega", "Evento da faculdade", "Site da faculdade", "Palestras e eventos", "Outro"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: revisão e envio ── */}
        {step === 3 && (
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              Confirme os dados
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
              Revise antes de enviar. Você poderá atualizar suas informações pelo painel depois.
            </p>

            <div className="space-y-4">
              {/* Resumo líder */}
              <div className="p-4 rounded-xl" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted-foreground)" }}>Líder da equipe</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span style={{ color: "var(--muted-foreground)" }}>Nome: </span><strong>{name}</strong></div>
                  <div><span style={{ color: "var(--muted-foreground)" }}>Curso: </span><strong>{course}</strong></div>
                  <div><span style={{ color: "var(--muted-foreground)" }}>E-mail: </span><strong>{email}</strong></div>
                  <div><span style={{ color: "var(--muted-foreground)" }}>Semestre: </span><strong>{semester}</strong></div>
                </div>
                {members.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                      Integrantes: {members.map((m) => m.name || "(sem nome)").join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Resumo projeto */}
              <div className="p-4 rounded-xl" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted-foreground)" }}>Projeto</p>
                <p className="font-semibold text-base mb-1" style={{ color: "var(--foreground)" }}>{projectName}</p>
                <p className="text-sm mb-3" style={{ color: "var(--muted-foreground)" }}>{description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                    {area}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                    {ideaStage}
                  </span>
                </div>
              </div>

              {/* Consentimento LGPD */}
              <label
                className="flex items-start gap-3 p-4 rounded-xl cursor-pointer"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  Declaro que li e aceito o uso dos meus dados pessoais pela Faculdade Antonio Meneghetti para fins de
                  acompanhamento no programa InfoHub, conforme a LGPD (Lei nº 13.709/2018). Os dados serão utilizados
                  exclusivamente para este fim e não serão compartilhados com terceiros sem consentimento.
                </span>
              </label>
              {errors.consent && <p style={errStyle}>{errors.consent}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Enviar inscrição ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
