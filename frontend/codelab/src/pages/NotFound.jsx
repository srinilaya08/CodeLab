import { Link } from 'react-router-dom';
import { Button } from '../components/common/UI';

export const NotFound = () => (
  <div className="container" style={{ textAlign: 'center', marginTop: '10vh' }}>
    <h1 style={{ fontSize: '6rem', fontWeight: '800', color: 'var(--primary)' }}>404</h1>
    <h2 style={{ marginBottom: '1rem' }}>Page Not Found</h2>
    <p className="text-secondary" style={{ marginBottom: '2rem' }}>The room or page you are looking for does not exist.</p>
    <Link to="/"><Button variant="primary">Back to Home</Button></Link>
  </div>
);