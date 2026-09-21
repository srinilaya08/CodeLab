import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('codelab_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

 const addToast = useCallback((message, type = 'info') => {
  const id = `${Date.now()}-${Math.random()}`;

  setToasts(prev => [
    ...prev,
    { id, message, type }
  ]);

  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 3000);
}, []);
const loginUser = (userData, token) => {
    localStorage.setItem('codelab_user', JSON.stringify(userData));
    localStorage.setItem('codelab_token', token);

    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('codelab_user');
    localStorage.removeItem('codelab_token');

    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, setUser,loginUser,logoutUser, addToast, toasts }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderLeftColor: t.type === 'error' ? 'var(--error)' : 'var(--primary)' }}>
            {t.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);