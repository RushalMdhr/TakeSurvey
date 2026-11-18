import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import SurveyAnalytics from './pages/SurveyAnalytics.jsx';
import SurveyBuilder from './pages/SurveyBuilder.jsx';
import SurveyPublic from './pages/SurveyPublic.jsx';
import './App.css';

function AdminLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/dashboard">
          <span className="brand-mark">t</span>
          <span>takesurvey</span>
        </Link>
        <nav className="topbar-nav">
          <Link to="/dashboard">Surveys</Link>
          <button className="text-button" type="button" onClick={logout}>Sign out</button>
        </nav>
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
