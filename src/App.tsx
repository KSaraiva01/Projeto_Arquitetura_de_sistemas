// Roteador principal: define as rotas reais da aplicação (URLs de verdade,
// funcionam com F5, voltar/avançar do navegador e links diretos).
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import LoginPage from "./components/LoginPage";
import AdminApp from "./components/admin/AdminApp";
import StudentApp from "./components/student/StudentApp";
import RegisterForm from "./components/student/RegisterForm";

// Bloqueia uma rota até existir sessão; se o perfil não bater, manda
// para a área correta em vez de dar tela em branco.
function ProtectedRoute({
  role,
  children,
}: {
  role: "admin" | "student";
  children: React.ReactNode;
}) {
  const { auth } = useAuth();

  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role !== role) {
    return <Navigate to={auth.role === "admin" ? "/admin" : "/student"} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { auth, login, logout } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={auth ? (auth.role === "admin" ? "/admin" : "/student") : "/login"} replace />} />

      <Route
        path="/login"
        element={
          auth ? (
            <Navigate to={auth.role === "admin" ? "/admin" : "/student"} replace />
          ) : (
            <LoginPage onLogin={login} />
          )
        }
      />

      <Route path="/register" element={<RegisterForm onLoginAfterRegister={login} />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminApp auth={auth!} onLogout={logout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/*"
        element={
          <ProtectedRoute role="student">
            <StudentApp auth={auth!} onLogout={logout} />
          </ProtectedRoute>
        }
      />

      {/* Qualquer rota desconhecida volta para o começo */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="size-full">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}
