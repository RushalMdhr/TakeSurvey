import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import SurveyAnalytics from './pages/SurveyAnalytics.jsx';
import SurveyBuilder from './pages/SurveyBuilder.jsx';
import SurveyPublic from './pages/SurveyPublic.jsx';

function AdminLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-mint-50/40 font-sans text-mint-900">
      <header className="sticky top-0 z-50 border-b border-mint-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link className="inline-flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-mint-900 no-underline" to="/dashboard">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-mint-200 text-[19px] font-extrabold text-mint-800">
            SF
          </span>
          <span>SurveyFlow</span>
        </Link>
          <nav className="flex items-center gap-5 text-sm sm:gap-6">
            {/* <Link className="text-mint-600 no-underline transition-colors hover:text-mint-800" to="/dashboard">
              Surveys
            </Link> */}
            <button
              className="border-0 bg-transparent p-0 text-sm font-semibold text-mint-600 transition-colors hover:text-mint-800"
              type="button"
              onClick={logout}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:slug" element={<SurveyPublic />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/surveys/new" element={<SurveyBuilder />} />
            <Route path="/surveys/:id/edit" element={<SurveyBuilder />} />
            <Route path="/surveys/:id/analytics" element={<SurveyAnalytics />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
