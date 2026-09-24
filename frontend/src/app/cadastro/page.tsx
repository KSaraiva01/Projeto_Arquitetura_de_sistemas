"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Plus, Trash2 } from "lucide-react";
import InfoHubLogo from "@/components/InfoHubLogo";
import PasswordRules from "@/components/PasswordRules";
import ThemeToggle from "@/components/ThemeToggle";
import { api, ApiError, describeError } from "@/lib/api";
import { IDEA_STAGE_LABELS, type ApiIdeaStage } from "@/lib/api-types";
import { passwordIsValid } from "@/lib/password";
import { HOW_DID_YOU_HEAR_OPTIONS, SEMESTERS } from "@/lib/types";

interface TeamMemberInput {
  name: string;
  email: string;
  course: string;
}

type Option = { id: string; name: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Q5 — mesmo limite da API (MAX_INTEGRANTES_EQUIPE): o líder mais 10 colegas. */
const MAX_COLEGAS = 10;

/** Campo da API (422) → campo do formulário, para o erro aparecer no lugar certo. */
const API_FIELD_TO_FORM: Record<string, string> = {
  "team.name": "ideaName",
  "team.description": "description",
  "team.areaId": "area",
  "team.ideaStage": "ideaStage",
  "team.howDidYouHear": "howDidYouHear",
  "leader.name": "name",
  "leader.email": "email",
  "leader.phone": "phone",
  "leader.course": "course",
  "leader.semester": "semester",
  "leader.password": "password",
  lgpdConsent: "lgpdConsent",
};

/**
 * RF-02, RF-04 e RF-05 — formulário inicial da ideia. Ao enviar, a API cria
 * a conta do líder (com esta senha), as contas dos colegas (que recebem o
 * link de ativação por e-mail) e a equipe na Etapa 1, e avisa a coordenação.
 * O líder só entra depois de confirmar o e-mail pelo link que recebe.
 */
export default function CadastroPage() {
  const [result, setResult] = useState<{ message: string; email: string } | null>(null);
  const [areas, setAreas] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    course: "",
    semester: "",
    ideaName: "",
    description: "",
    area: "",
    ideaStage: "" as ApiIdeaStage | "",
    howDidYouHear: "",
    password: "",
    confirmPassword: "",
  });

  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [members, setMembers] = useState<TeamMemberInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Áreas e cursos vêm do banco (a mesma lista que a API valida).
  useEffect(() => {
    Promise.all([api.areas(), api.courses()]).then(
      ([areaList, courseList]) => {
        setAreas(areaList.data);
        setCourses(courseList.data);
      },
      (err: unknown) => setOptionsError(describeError(err, "Não foi possível carregar as áreas e os cursos. A API está no ar?")),
    );
  }, []);

  function addMember() {
    if (members.length >= MAX_COLEGAS) return;
    setMembers([...members, { name: "", email: "", course: "" }]);
  }

  function removeMember(idx: number) {
    setMembers(members.filter((_, i) => i !== idx));
    clearError(`member-${idx}`);
  }

  function updateMember(idx: number, field: keyof TeamMemberInput, value: string) {
    const updated = [...members];
    updated[idx] = { ...updated[idx], [field]: value };
    setMembers(updated);
    clearError(`member-${idx}`);
  }

  function clearError(field: string) {
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  }

  function updateField(field: keyof typeof formData, value: string) {
    setFormData({ ...formData, [field]: value });
    clearError(field);
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const required: [keyof typeof formData, string][] = [
      ["name", "Nome completo"],
      ["email", "E-mail"],
      ["phone", "Telefone/WhatsApp"],
      ["course", "Curso"],
      ["semester", "Semestre/período"],
      ["ideaName", "Nome da ideia"],
      ["description", "Descrição da ideia"],
      ["area", "Área da ideia"],
      ["ideaStage", "Estágio da ideia"],
      ["password", "Senha"],
      ["confirmPassword", "Confirmação de senha"],
    ];

    for (const [key, label] of required) {
      if (!formData[key].trim()) {
        newErrors[key] = `${label} é obrigatório`;
      }
    }

    if (formData.name && formData.name.trim().length < 3) newErrors.name = "Informe o nome completo";
    if (formData.email && !EMAIL_RE.test(formData.email.trim())) newErrors.email = "Informe um e-mail válido";
    if (formData.phone && formData.phone.replace(/\D/g, "").length < 8) newErrors.phone = "Informe o telefone com DDD";
    if (formData.ideaName && formData.ideaName.trim().length < 3) newErrors.ideaName = "Dê um nome à ideia";
    if (formData.description && formData.description.trim().length < 20) {
      newErrors.description = "Descreva a ideia com um pouco mais de detalhe (ao menos 20 caracteres)";
    }
    if (formData.password && !passwordIsValid(formData.password)) {
      newErrors.password = "A senha ainda não cumpre as regras abaixo";
    }
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    members.forEach((member, idx) => {
      const empty = !member.name.trim() && !member.email.trim() && !member.course;
      if (empty) return; // linha em branco é ignorada no envio
      if (member.name.trim().length < 3 || !EMAIL_RE.test(member.email.trim()) || !member.course) {
        newErrors[`member-${idx}`] = "Preencha nome, e-mail válido e curso do colega (ou remova a linha)";
      } else if (member.email.trim().toLowerCase() === formData.email.trim().toLowerCase()) {
        newErrors[`member-${idx}`] = "Este é o seu e-mail — você já é o líder da equipe";
      }
    });

    if (!lgpdConsent) {
      newErrors.lgpdConsent = "É necessário concordar com o tratamento dos dados para continuar";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const response = await api.registerTeam({
        team: {
          name: formData.ideaName.trim(),
          description: formData.description.trim(),
          areaId: formData.area,
          ideaStage: formData.ideaStage as ApiIdeaStage,
          ...(formData.howDidYouHear ? { howDidYouHear: formData.howDidYouHear } : {}),
        },
        leader: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          course: formData.course,
          semester: formData.semester,
          password: formData.password,
        },
        members: members
          .filter((member) => member.name.trim() || member.email.trim() || member.course)
          .map((member) => ({ name: member.name.trim(), email: member.email.trim(), course: member.course })),
        lgpdConsent: true,
      });
      setResult({ message: response.message, email: formData.email.trim() });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof ApiError && err.fields?.length) {
        const fromApi: Record<string, string> = {};
        for (const { field, message } of err.fields) {
          const member = /^members\.(\d+)\./.exec(field);
          fromApi[member ? `member-${member[1]}` : (API_FIELD_TO_FORM[field] ?? field)] = message;
        }
        setErrors(fromApi);
        setFormError("Alguns campos estão inválidos. Confira os destaques acima.");
      } else {
        setFormError(describeError(err, "Não foi possível conectar à API. Tente de novo em instantes."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="animate-rise bg-card rounded-2xl shadow-sm border border-card-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Ideia enviada!</h2>
          <p className="text-muted mb-4">{result.message}</p>
          <p className="text-sm text-muted-light mb-6">
            Não achou o e-mail em <strong className="text-foreground">{result.email}</strong>? Confira o spam. Na tela
            de login, ao tentar entrar, dá para pedir um novo link de confirmação.
          </p>
          <Link
            href="/#login"
            className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full px-4 py-2.5 bg-input-bg border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
      errors[field] ? "border-red-400" : "border-input-border"
    }`;

  const loadingOptions = !optionsError && (areas.length === 0 || courses.length === 0);

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

      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Envie sua ideia</h1>
          <p className="text-muted">
            Preencha o formulário abaixo para inscrever sua ideia no programa InfoHub.
            Mesmo que sua ideia esteja em fase inicial, envie! Vamos ajudar a desenvolvê-la.
          </p>
        </div>

        {optionsError && (
          <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {optionsError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <section className="bg-card rounded-xl border border-card-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Dados pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="cad-name" className="block text-sm font-medium text-foreground mb-1">Nome completo *</label>
                <input id="cad-name" type="text" autoComplete="name" value={formData.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass("name")} />
                {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="cad-email" className="block text-sm font-medium text-foreground mb-1">E-mail *</label>
                <input id="cad-email" type="email" autoComplete="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass("email")} />
                {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="cad-phone" className="block text-sm font-medium text-foreground mb-1">Telefone/WhatsApp *</label>
                <input
                  id="cad-phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                  className={inputClass("phone")}
                />
                {errors.phone && <p className="text-xs text-danger mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="cad-course" className="block text-sm font-medium text-foreground mb-1">Curso *</label>
                <select id="cad-course" value={formData.course} onChange={(e) => updateField("course", e.target.value)} className={inputClass("course")}>
                  <option value="">{loadingOptions ? "Carregando..." : "Selecione..."}</option>
                  {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                {errors.course && <p className="text-xs text-danger mt-1">{errors.course}</p>}
              </div>
              <div>
                <label htmlFor="cad-semester" className="block text-sm font-medium text-foreground mb-1">Semestre/período *</label>
                <select id="cad-semester" value={formData.semester} onChange={(e) => updateField("semester", e.target.value)} className={inputClass("semester")}>
                  <option value="">Selecione...</option>
                  {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.semester && <p className="text-xs text-danger mt-1">{errors.semester}</p>}
              </div>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-card-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Equipe</h2>
                <p className="text-sm text-muted">
                  Adicione os colegas que farão parte da equipe (opcional, até {MAX_COLEGAS}). Cada um recebe um e-mail
                  para criar a própria senha.
                </p>
              </div>
              <button
                type="button"
                onClick={addMember}
                disabled={members.length >= MAX_COLEGAS}
                className="flex shrink-0 items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            {members.length === 0 && (
              <p className="text-sm text-muted-light py-4 text-center border border-dashed border-card-border rounded-lg">
                Nenhum integrante adicionado. Você pode adicionar depois, pela sua área no sistema.
              </p>
            )}
            {members.map((member, idx) => (
              <div key={idx} className="mt-3">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMember(idx, "name", e.target.value)}
                      placeholder="Nome"
                      aria-label={`Nome do colega ${idx + 1}`}
                      className={inputClass(`member-${idx}`)}
                    />
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(idx, "email", e.target.value)}
                      placeholder="E-mail"
                      aria-label={`E-mail do colega ${idx + 1}`}
                      className={inputClass(`member-${idx}`)}
                    />
                    <select
                      value={member.course}
                      onChange={(e) => updateMember(idx, "course", e.target.value)}
                      aria-label={`Curso do colega ${idx + 1}`}
                      className={inputClass(`member-${idx}`)}
                    >
                      <option value="">Curso...</option>
                      {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(idx)}
                    aria-label={`Remover o colega ${idx + 1}`}
                    className="p-2 text-muted-light hover:text-danger mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {errors[`member-${idx}`] && <p className="text-xs text-danger mt-1">{errors[`member-${idx}`]}</p>}
              </div>
            ))}
          </section>

          <section className="bg-card rounded-xl border border-card-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Sobre a ideia</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="cad-idea" className="block text-sm font-medium text-foreground mb-1">Nome da ideia/projeto *</label>
                <input id="cad-idea" type="text" value={formData.ideaName} onChange={(e) => updateField("ideaName", e.target.value)} className={inputClass("ideaName")} />
                {errors.ideaName && <p className="text-xs text-danger mt-1">{errors.ideaName}</p>}
              </div>
              <div>
                <label htmlFor="cad-description" className="block text-sm font-medium text-foreground mb-1">Descrição da ideia *</label>
                <textarea
                  id="cad-description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Descreva sua ideia, mesmo que ainda esteja em fase inicial..."
                  className={`${inputClass("description")} resize-none`}
                />
                {errors.description && <p className="text-xs text-danger mt-1">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cad-area" className="block text-sm font-medium text-foreground mb-1">Área/setor *</label>
                  <select id="cad-area" value={formData.area} onChange={(e) => updateField("area", e.target.value)} className={inputClass("area")}>
                    <option value="">{loadingOptions ? "Carregando..." : "Selecione..."}</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {errors.area && <p className="text-xs text-danger mt-1">{errors.area}</p>}
                </div>
                <div>
                  <label htmlFor="cad-stage" className="block text-sm font-medium text-foreground mb-1">Estágio atual *</label>
                  <select id="cad-stage" value={formData.ideaStage} onChange={(e) => updateField("ideaStage", e.target.value)} className={inputClass("ideaStage")}>
                    <option value="">Selecione...</option>
                    {(Object.keys(IDEA_STAGE_LABELS) as ApiIdeaStage[]).map((stage) => (
                      <option key={stage} value={stage}>{IDEA_STAGE_LABELS[stage]}</option>
                    ))}
                  </select>
                  {errors.ideaStage && <p className="text-xs text-danger mt-1">{errors.ideaStage}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="cad-heard" className="block text-sm font-medium text-foreground mb-1">Como conheceu o InfoHub? (opcional)</label>
                <select
                  id="cad-heard"
                  value={formData.howDidYouHear}
                  onChange={(e) => updateField("howDidYouHear", e.target.value)}
                  className={inputClass("howDidYouHear")}
                >
                  <option value="">Selecione...</option>
                  {HOW_DID_YOU_HEAR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-card-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Criar acesso</h2>
            <p className="text-sm text-muted mb-4">
              Você vai entrar com o seu e-mail e esta senha, depois de confirmar o e-mail pelo link que enviaremos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cad-password" className="block text-sm font-medium text-foreground mb-1">Senha *</label>
                <input id="cad-password" type="password" autoComplete="new-password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className={inputClass("password")} />
                {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
              </div>
              <div>
                <label htmlFor="cad-password2" className="block text-sm font-medium text-foreground mb-1">Confirmar senha *</label>
                <input id="cad-password2" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className={inputClass("confirmPassword")} />
                {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
            <PasswordRules value={formData.password} />
          </section>

          <section className="bg-card rounded-xl border border-card-border p-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={(e) => {
                  setLgpdConsent(e.target.checked);
                  clearError("lgpdConsent");
                }}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-sm text-muted">
                Li e concordo com a{" "}
                <Link href="/privacidade" target="_blank" className="font-medium text-primary hover:text-primary-dark">
                  política de privacidade
                </Link>{" "}
                e com o tratamento dos meus dados pessoais pelo InfoHub, conforme a Lei Geral de Proteção de Dados
                (LGPD), para fins de acompanhamento da jornada no programa. Os colegas que eu incluir aceitam a
                política ao ativar a própria conta. *
              </span>
            </label>
            {errors.lgpdConsent && <p className="text-xs text-danger mt-2">{errors.lgpdConsent}</p>}
          </section>

          {formError && (
            <p key={formError} role="alert" className="animate-shake flex items-start gap-1.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting || Boolean(optionsError)}
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Enviando..." : "Enviar ideia"}
            </button>
            <Link href="/" className="text-sm text-muted hover:text-foreground">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
