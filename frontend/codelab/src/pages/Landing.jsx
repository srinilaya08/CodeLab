import { Link } from "react-router-dom";
import {
  Code2,
  Users,
  Terminal,
  History,
  MessageSquare
} from "lucide-react";

export const Landing = () => {
  const features = [
    {
      icon: <Users size={24} />,
      title: "Real-Time Collaboration",
      desc: "Code together with your team instantly, just like Google Docs for developers.",
    },
    {
      icon: <Terminal size={24} />,
      title: "Browser-Based IDE",
      desc: "Powered by Monaco Editor. Full syntax highlighting, minimap, and IntelliSense.",
    },
    {
      icon: <MessageSquare size={24} />,
      title: "Integrated Team Chat",
      desc: "Discuss logic and share snippets without leaving your coding environment.",
    },
    {
      icon: <History size={24} />,
      title: "Version History",
      desc: "Never lose progress. Track changes and restore previous versions effortlessly.",
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          padding: "6rem 0",
          textAlign: "center",
          background:
            "radial-gradient(circle at top, var(--primary-glow) 0%, transparent 70%)",
        }}
      >
        <div className="container">
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: "800",
              lineHeight: "1.1",
              marginBottom: "1.5rem",
            }}
          >
            Code Together.{" "}
            <span style={{ color: "var(--primary)" }}>Build Together.</span>
          </h1>
          <p
            className="text-secondary"
            style={{
              fontSize: "1.25rem",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
            }}
          >
            The ultimate browser-based collaborative coding platform for teams,
            students, and interview prep.
          </p>
          <div className="flex gap-4" style={{ justifyContent: "center" }}>
            <Link to="/register">
              <button
                className="btn btn-primary"
                style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}
              >
                Start Coding Free
              </button>
            </Link>
            <button
              className="btn btn-secondary"
              style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}
            >
              Explore Features
            </button>
          </div>

          {/* Mock Editor UI */}
          <div
            className="card"
            style={{
              marginTop: "4rem",
              maxWidth: "900px",
              margin: "4rem auto 0",
              padding: "0",
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div
              className="flex items-center gap-2"
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid var(--border-color)",
                background: "var(--bg-tertiary)",
              }}
            >
              <div className="flex gap-2">
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "#ef4444",
                  }}
                ></div>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "#f59e0b",
                  }}
                ></div>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "#10b981",
                  }}
                ></div>
              </div>
              <span
                className="text-sm text-secondary"
                style={{ marginLeft: "1rem" }}
              >
                app.js — CodeLab
              </span>
            </div>
            <div className="flex" style={{ minHeight: "300px" }}>
              <div
                style={{
                  width: "200px",
                  borderRight: "1px solid var(--border-color)",
                  padding: "1rem",
                }}
              >
                <div className="text-sm text-secondary mb-2">EXPLORER</div>
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ padding: "4px 0", color: "var(--primary)" }}
                >
                  📄 app.js
                </div>
                <div
                  className="flex items-center gap-2 text-sm text-secondary"
                  style={{ padding: "4px 0" }}
                >
                  📄 utils.js
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "1rem",
                  fontFamily: "monospace",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  <span style={{ color: "#c084fc" }}>function</span>{" "}
                  <span style={{ color: "#60a5fa" }}>collaborate</span>() {"{"}
                </div>
                <div style={{ paddingLeft: "1.5rem" }}>
                  <span style={{ color: "#c084fc" }}>const</span> team = [
                  <span style={{ color: "#86efac" }}>'You'</span>,{" "}
                  <span style={{ color: "#86efac" }}>'Teammate'</span>];
                </div>
                <div style={{ paddingLeft: "1.5rem" }}>
                  <span style={{ color: "#c084fc" }}>return</span> team.
                  <span style={{ color: "#60a5fa" }}>join</span>(
                  <span style={{ color: "#86efac" }}>
                    ' & build amazing things'
                  </span>
                  );
                </div>
                <div>{"}"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container" style={{ padding: "6rem 1.5rem" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: "2rem",
            marginBottom: "3rem",
          }}
        >
          Everything you need to ship faster
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {features.map((f, i) => (
            <div key={i} className="card">
              <div style={{ color: "var(--primary)", marginBottom: "1rem" }}>
                {f.icon}
              </div>
              <h3 style={{ marginBottom: "0.5rem" }}>{f.title}</h3>
              <p className="text-sm text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          padding: "3rem 0",
          marginTop: "4rem",
        }}
      >
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Code2 size={20} color="var(--primary)" />
            <span style={{ fontWeight: "700" }}>CodeLab</span>
          </div>

          <p className="text-sm text-secondary">
            © 2026 CodeLab. Built for developers.{" "}
            <span
              style={{
                color: "var(--text-primary)",
                fontWeight: "500",
              }}
            >
              A project by Srinilaya Marripalli
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
};
