import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Room } from './pages/Room';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <AppProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Hide default navbar on the Room page for full IDE experience */}
          <Routes>
            <Route path="/room/:roomCode" element={<Room />} />
            <Route path="*" element={
              <>
                <Navbar />
                <main style={{ flex: 1 }}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Auth type="login" />} />
                    <Route path="/register" element={<Auth type="register" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </>
            } />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;