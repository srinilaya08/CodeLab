import { X } from 'lucide-react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
};

export const Input = ({ label, error, ...props }) => (
  <div className="flex flex-col gap-2">
    {label && <label className="text-sm text-secondary">{label}</label>}
    <input className="input" {...props} />
    {error && <span className="text-sm" style={{ color: 'var(--error)' }}>{error}</span>}
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};