import { Link, useLocation} from 'react-router-dom';
import { Code2, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useApp();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  return (
    <nav style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
      <div className="container flex justify-between items-center" style={{ height: '64px' }}>
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
          <div style={{ background: 'var(--primary)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
            <Code2 size={20} color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>CodeLab</span>
        </Link>

        <div className="flex items-center gap-4 hide-mobile">
          <Link to="/" className="text-secondary" style={{ textDecoration: 'none' }}>Home</Link>
          <Link to="/dashboard" className="text-secondary" style={{ textDecoration: 'none' }}>Dashboard</Link>
          {user && !isLandingPage ? (
 <div
  className="flex items-center gap-3"
  style={{
    borderLeft: "1px solid var(--border-color)",
    paddingLeft: "1rem",
    marginLeft: "0.25rem",
  }}
>
  <span className="text-sm text-secondary">
    {user.username}
  </span>

  <div
    style={{
      width: "32px",
      height: "32px",
      background: "var(--primary)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <User size={18} color="white" />
  </div>
</div>
) : (
  <>
    <Link to="/login">
      <button className="btn btn-ghost">Log In</button>
    </Link>

    <Link to="/register">
      <button className="btn btn-primary">Get Started</button>
    </Link>
  </>
)}
        </div>

        <button className="btn-ghost hide-mobile" style={{ display: 'none' }} /* Mobile toggle handled via CSS/media queries in real app, simplified here */>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </nav>
  );
};