"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, describeError } from "@/lib/api";

/**
 * Inclusão de um colega na equipe (RF-02) — pelo líder ou pelo admin/mentor:
 * nome, e-mail e curso. A conta nova recebe por e-mail o link para criar a
 * senha; a API recusa quem já está em outra equipe ativa (RN-03).
 */
export default function AddMemberForm({
  teamId,
  onCancel,
  onAdded,
}: {
  teamId: string;
  onCancel: () => void;
  onAdded: (message: string) => Promise<void>;
}) {
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ name: "", email: "", course: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.courses().then(
      (result) => {
        if (!cancelled) setCourses(result.data);
      },
      () => {
        if (!cancelled) setError("Não foi possível carregar os cursos.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const invalid = form.name.trim().length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !form.course;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (invalid || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.addMember(teamId, { name: form.name.trim(), email: form.email.trim(), course: form.course });
      await onAdded(result.message);
    } catch (err) {
      setError(describeError(err, "Não foi possível incluir o colega."));
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <form onSubmit={submit} className="animate-rise mt-4 space-y-2 rounded-lg border-2 border-dashed border-primary/30 bg-highlight-bg p-3">
      <p className="text-xs text-muted">
        O colega recebe um e-mail para criar a senha. Um aluno só pode estar em uma equipe ativa por vez.
      </p>
      <input
        type="text"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        placeholder="Nome completo"
        aria-label="Nome do colega"
        className={fieldClass}
      />
      <input
        type="email"
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        placeholder="E-mail"
        aria-label="E-mail do colega"
        className={fieldClass}
      />
      <select
        value={form.course}
        onChange={(event) => setForm({ ...form, course: event.target.value })}
        aria-label="Curso do colega"
        className={fieldClass}
      >
        <option value="">Curso...</option>
        {courses.map((course) => (
          <option key={course.id} value={course.name}>
            {course.name}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-muted hover:text-foreground">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={invalid || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Incluir
        </button>
      </div>
    </form>
  );
}
