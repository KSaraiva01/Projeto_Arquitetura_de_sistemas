"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lightbulb, Plus, Trash2, ArrowLeft, CheckCircle } from "lucide-react";
import { AREAS } from "@/lib/mock-data";

interface TeamMemberInput {
  name: string;
  course: string;
}

export default function CadastroPage() {
  const router = useRouter();
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
    howFound: "",
    password: "",
    confirmPassword: "",
  });

  const [members, setMembers] = useState<TeamMemberInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addMember() {
    setMembers([...members, { name: "", course: "" }]);
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
      ["phone", "Telefone"],
      ["course", "Curso"],
      ["semester", "Semestre"],
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ideia enviada!</h2>
          <p className="text-gray-500 mb-6">
            Sua ideia foi cadastrada com sucesso. A equipe do InfoHub irá analisar sua proposta e entrar em contato em breve.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Você receberá um e-mail de confirmação em <strong>{formData.email}</strong>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800">InfoHub</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Envie sua ideia</h1>
          <p className="text-gray-500">
            Preencha o formulário abaixo para inscrever sua ideia no programa InfoHub.
            Mesmo que sua ideia esteja em fase inicial, envie! Vamos ajudar a desenvolvê-la.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dados pessoais */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Dados pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.name ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.email ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone/WhatsApp *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(55) 99999-9999"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.phone ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.phone && <p className="text-xs text-danger mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => updateField("course", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.course ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.course && <p className="text-xs text-danger mt-1">{errors.course}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semestre/Período *</label>
                <input
                  type="text"
                  value={formData.semester}
                  onChange={(e) => updateField("semester", e.target.value)}
                  placeholder="Ex: 4º"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.semester ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.semester && <p className="text-xs text-danger mt-1">{errors.semester}</p>}
              </div>
            </div>
          </section>

          {/* Equipe */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Equipe</h2>
                <p className="text-sm text-gray-500">Adicione os colegas que farão parte da equipe (opcional)</p>
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
              <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                Nenhum integrante adicionado. Você pode adicionar depois.
              </p>
            )}
            {members.map((member, idx) => (
              <div key={idx} className="flex gap-3 items-start mt-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateMember(idx, "name", e.target.value)}
                    placeholder="Nome do integrante"
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <input
                    type="text"
                    value={member.course}
                    onChange={(e) => updateMember(idx, "course", e.target.value)}
                    placeholder="Curso"
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(idx)}
                  className="p-2 text-gray-400 hover:text-danger mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </section>

          {/* Ideia */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Sobre a ideia</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da ideia/projeto *</label>
                <input
                  type="text"
                  value={formData.ideaName}
                  onChange={(e) => updateField("ideaName", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.ideaName ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.ideaName && <p className="text-xs text-danger mt-1">{errors.ideaName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da ideia *</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Descreva sua ideia, mesmo que ainda esteja em fase inicial..."
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none ${errors.description ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.description && <p className="text-xs text-danger mt-1">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área/setor *</label>
                  <select
                    value={formData.area}
                    onChange={(e) => updateField("area", e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${errors.area ? "border-red-400" : "border-gray-300"}`}
                  >
                    <option value="">Selecione...</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {errors.area && <p className="text-xs text-danger mt-1">{errors.area}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estágio atual *</label>
                  <select
                    value={formData.ideaStage}
                    onChange={(e) => updateField("ideaStage", e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${errors.ideaStage ? "border-red-400" : "border-gray-300"}`}
                  >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Como conheceu o InfoHub?</label>
                <input
                  type="text"
                  value={formData.howFound}
                  onChange={(e) => updateField("howFound", e.target.value)}
                  placeholder="Ex: indicação de professor, redes sociais, evento..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          </section>

          {/* Senha */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Criar acesso</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.password ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.confirmPassword ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </section>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm"
            >
              Enviar ideia
            </button>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
