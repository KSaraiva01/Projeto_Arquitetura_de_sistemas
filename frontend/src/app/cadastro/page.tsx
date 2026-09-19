"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, CheckCircle } from "lucide-react";
import InfoHubLogo from "@/components/InfoHubLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { AREAS, COURSES } from "@/lib/mock-data";
import { SEMESTERS, HOW_DID_YOU_HEAR_OPTIONS } from "@/lib/types";

interface TeamMemberInput {
  name: string;
  email: string;
  course: string;
}

export default function CadastroPage() {
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    course: "",
    semester: "",
    ideaName: "",
    description: "",
    area: "",
    ideaStage: "",
    howDidYouHear: "",
    password: "",
    confirmPassword: "",
  });

  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [members, setMembers] = useState<TeamMemberInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addMember() {
    setMembers([...members, { name: "", email: "", course: "" }]);
  }

  function removeMember(idx: number) {
    setMembers(members.filter((_, i) => i !== idx));
  }

  function updateMember(idx: number, field: keyof TeamMemberInput, value: string) {
    const updated = [...members];
    updated[idx] = { ...updated[idx], [field]: value };
    setMembers(updated);
  }

  function updateField(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const required: [string, string][] = [
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
      if (!formData[key as keyof typeof formData]) {
        newErrors[key] = `${label} é obrigatório`;
      }
    }

    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    if (!lgpdConsent) {
      newErrors.lgpdConsent = "É necessário concordar com o tratamento dos dados para continuar";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Ideia enviada!</h2>
          <p className="text-muted mb-6">
            Sua ideia foi cadastrada com sucesso. A equipe do InfoHub irá analisar sua proposta e entrar em contato em breve.
          </p>
          <p className="text-sm text-muted-light mb-6">
            Você receberá um e-mail de confirmação em <strong className="text-foreground">{formData.email}</strong>
          </p>
          <Link
            href="/"
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

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-card-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-light hover:text-foreground">
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

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="bg-card rounded-xl border border-card-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Dados pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Nome completo *</label>
                <input type="text" value={formData.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass("name")} />
                {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">E-mail *</label>
                <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass("email")} />
                {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Telefone/WhatsApp *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                  className={inputClass("phone")}
                />
                {errors.phone && <p className="text-xs text-danger mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Curso *</label>
                <select value={formData.course} onChange={(e) => updateField("course", e.target.value)} className={inputClass("course")}>
                  <option value="">Selecione...</option>
                  {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.course && <p className="text-xs text-danger mt-1">{errors.course}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Semestre/período *</label>
                <select value={formData.semester} onChange={(e) => updateField("semester", e.target.value)} className={inputClass("semester")}>
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
                <p className="text-sm text-muted">Adicione os colegas que farão parte da equipe (opcional)</p>
              </div>
              <button
                type="button"
                onClick={addMember}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            {members.length === 0 && (
              <p className="text-sm text-muted-light py-4 text-center border border-dashed border-card-border rounded-lg">
                Nenhum integrante adicionado. Você pode adicionar depois.
              </p>
            )}
            {members.map((member, idx) => (
              <div key={idx} className="flex gap-3 items-start mt-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" value={member.name} onChange={(e) => updateMember(idx, "name", e.target.value)} placeholder="Nome" className={inputClass("")} />
                  <input type="email" value={member.email} onChange={(e) => updateMember(idx, "email", e.target.value)} placeholder="E-mail" className={inputClass("")} />
                  <select value={member.course} onChange={(e) => updateMember(idx, "course", e.target.value)} className={inputClass("")}>
                    <option value="">Curso...</option>
                    {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => removeMember(idx)} className="p-2 text-muted-light hover:text-danger mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </section>

          <section className="bg-card rounded-xl border border-card-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Sobre a ideia</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome da ideia/projeto *</label>
                <input type="text" value={formData.ideaName} onChange={(e) => updateField("ideaName", e.target.value)} className={inputClass("ideaName")} />
                {errors.ideaName && <p className="text-xs text-danger mt-1">{errors.ideaName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descrição da ideia *</label>
                <textarea
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
                  <label className="block text-sm font-medium text-foreground mb-1">Área/setor *</label>
                  <select value={formData.area} onChange={(e) => updateField("area", e.target.value)} className={inputClass("area")}>
                    <option value="">Selecione...</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {errors.area && <p className="text-xs text-danger mt-1">{errors.area}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Estágio atual *</label>
                  <select value={formData.ideaStage} onChange={(e) => updateField("ideaStage", e.target.value)} className={inputClass("ideaStage")}>
                    <option value="">Selecione...</option>
                    <option value="apenas_ideia">Apenas ideia</option>
                    <option value="prototipo">Protótipo</option>
                    <option value="mvp_desenvolvimento">MVP em desenvolvimento</option>
                    <option value="mvp_pronto">MVP pronto</option>
                  </select>
                  {errors.ideaStage && <p className="text-xs text-danger mt-1">{errors.ideaStage}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Como conheceu o InfoHub? (opcional)</label>
                <select
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
            <h2 className="text-lg font-semibold text-foreground mb-4">Criar acesso</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Senha *</label>
                <input type="password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className={inputClass("password")} />
                {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Confirmar senha *</label>
                <input type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className={inputClass("confirmPassword")} />
                {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-card-border p-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={(e) => {
                  setLgpdConsent(e.target.checked);
                  if (errors.lgpdConsent) {
                    const newErrors = { ...errors };
                    delete newErrors.lgpdConsent;
                    setErrors(newErrors);
                  }
                }}
                className="mt-0.5 rounded border-input-border"
              />
              <span className="text-sm text-muted">
                Li e concordo com o tratamento dos meus dados pessoais e dos dados dos integrantes da equipe pelo InfoHub,
                conforme a Lei Geral de Proteção de Dados (LGPD), para fins de acompanhamento da jornada no programa. *
              </span>
            </label>
            {errors.lgpdConsent && <p className="text-xs text-danger mt-2">{errors.lgpdConsent}</p>}
          </section>

          <div className="flex items-center gap-4">
            <button type="submit" className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm">
              Enviar ideia
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
