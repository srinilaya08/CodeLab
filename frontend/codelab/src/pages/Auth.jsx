import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button, Input } from '../components/common/UI';
import { Eye, EyeOff } from 'lucide-react';

export const Auth = ({ type }) => {
  const isLogin = type === 'login';

  const navigate = useNavigate();

  const { addToast, loginUser } = useApp();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && formData.password !== formData.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin
  ? `${import.meta.env.VITE_API_URL}/api/auth/login`
  : `${import.meta.env.VITE_API_URL}/api/auth/register`;

      const body = isLogin
        ? {
            email: formData.email,
            password: formData.password
          }
        : {
            username: formData.username,
            email: formData.email,
            password: formData.password
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (isLogin) {
        loginUser(data.user, data.token);

        addToast('Welcome back!', 'success');

        navigate('/dashboard');
      } else {
        addToast(
          'Account created successfully! Please log in.',
          'success'
        );

        navigate('/login');
      }

    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container"
      style={{
        maxWidth: '450px',
        marginTop: '4rem',
        padding: '0 1rem'
      }}
    >
      <div className="card">

        <h2 style={{ marginBottom: '0.5rem' }}>
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>

        <p
          className="text-sm text-secondary"
          style={{ marginBottom: '2rem' }}
        >
          {isLogin
            ? 'Enter your credentials to access your rooms.'
            : 'Start collaborating in seconds.'}
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >

          {!isLogin && (
            <Input
              label="Username"
              name="username"
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
              required
            />
          )}

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div style={{ position: 'relative' }}>
            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <button
              type="button"
              className="btn-ghost"
              style={{
                position: 'absolute',
                right: '8px',
                top: '32px',
                padding: '4px'
              }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword
                ? <EyeOff size={16} />
                : <Eye size={16} />
              }
            </button>
          </div>

          {!isLogin && (
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading
              ? 'Processing...'
              : isLogin
                ? 'Log In'
                : 'Create Account'
            }
          </Button>

        </form>

        <p
          className="text-sm text-secondary"
          style={{
            textAlign: 'center',
            marginTop: '1.5rem'
          }}
        >
          {isLogin
            ? "Don't have an account? "
            : "Already have an account? "
          }

          <Link
            to={isLogin ? '/register' : '/login'}
            style={{
              color: 'var(--primary)',
              textDecoration: 'none'
            }}
          >
            {isLogin ? 'Register' : 'Log in'}
          </Link>
        </p>

      </div>
    </div>
  );
};