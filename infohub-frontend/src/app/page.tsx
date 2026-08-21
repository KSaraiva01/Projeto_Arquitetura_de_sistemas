"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "aluno">("aluno");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/aluno");
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Lightbulb className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2">
            info<span className="text-primary">Hub</span>
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            Conectando conhecimento, tecnologia & inovação
          </p>
          <div className="space-y-4 text-left">
            {[
              "Acompanhe sua jornada do início ao InovAMF",
              "Receba tarefas e envie seus entregáveis",
              "Gerencie prazos e mentores em um só lugar",
            ].map((text) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                </div>
                <p className="text-gray-300 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">
              info<span className="text-primary">Hub</span>
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Bem-vindo</h2>
            <p className="text-gray-500 text-sm mb-6">Faça login para acessar o sistema</p>

            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setRole("aluno")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  role === "aluno" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                }`}
              >
                Aluno
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  role === "admin" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                }`}
              >
                Administrador
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-danger">{error}</p>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300" />
                  Lembrar-me
                </label>
                <button type="button" className="text-sm text-primary hover:text-primary-dark">
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm"
              >
                Entrar
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Ainda não tem conta?{" "}
                <Link href="/cadastro" className="text-primary hover:text-primary-dark font-medium">
                  Envie sua ideia
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Faculdade Antonio Meneghetti &mdash; InfoHub &rarr; InovAMF
          </p>
        </div>
      </div>
    </div>
  );
}
