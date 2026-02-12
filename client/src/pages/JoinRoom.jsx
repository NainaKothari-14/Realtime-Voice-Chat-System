import { useState } from "react";
import { useSocket } from "../hooks/useSocket";

export default function JoinRoom({ onJoin }) {
  const socket = useSocket();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("room-1");

  const join = () => {
    if (!name.trim()) return alert("Enter your name");

    localStorage.setItem("vc_name", name.trim());

    socket.emit("room:join", {
      roomId,
      user: { name: name.trim() },
    });

    onJoin?.();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") join();
  };

  return (
    <div style={styles.container}>
      {/* Left Panel - Branding */}
      <div style={styles.leftPanel}>
        <div style={styles.logoSection}>
          <div style={styles.logo}>
            {/* Improved microphone icon with better detail and clarity */}
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <h1 style={styles.brandTitle}>VoiceChat</h1>
          <p style={styles.brandSubtitle}>Connect • Chat • Collaborate</p>
          
          {/* Feature highlights */}
          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>💬</span>
              <span>Real-time messaging</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🎙️</span>
              <span>Voice channels</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📞</span>
              <span>Video calls</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>Welcome back!</h2>
          <p style={styles.subtitle}>We're so excited to see you again!</p>

          <div style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                DISPLAY NAME <span style={{color: '#f04747'}}>*</span>
              </label>
              <input
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                maxLength={20}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                ROOM ID <span style={{color: '#f04747'}}>*</span>
              </label>
              <input
                style={styles.input}
                placeholder="room-1"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={30}
              />
            </div>

            <button 
              style={styles.button}
              onClick={join}
            >
              Join Room
            </button>

            <div style={styles.hint}>
              Need an invite? Ask your friends for a room ID
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        input:focus {
          outline: none;
          border-color: #5865f2 !important;
          box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.1);
        }

        button:hover {
          background: #4752c4 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
        }

        button:active {
          transform: translateY(0px);
          box-shadow: 0 2px 4px rgba(88, 101, 242, 0.2);
        }

        @media (max-width: 768px) {
          .leftPanel { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    background: "#313338",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  leftPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    background: "linear-gradient(135deg, #5865f2 0%, #4752c4 100%)",
    position: "relative",
    overflow: "hidden",
  },
  logoSection: {
    textAlign: "center",
    maxWidth: "450px",
    zIndex: 1,
  },
  logo: {
    width: "120px",
    height: "120px",
    margin: "0 auto 30px",
    background: "rgba(255, 255, 255, 0.15)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    animation: "float 3s ease-in-out infinite",
  },
  brandTitle: {
    fontSize: "52px",
    fontWeight: "800",
    color: "white",
    margin: "0 0 16px",
    letterSpacing: "-1.5px",
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  brandSubtitle: {
    fontSize: "20px",
    color: "rgba(255, 255, 255, 0.9)",
    margin: "0 0 40px",
    fontWeight: "500",
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "40px",
  },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: "16px",
    padding: "12px 20px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    backdropFilter: "blur(5px)",
  },
  featureIcon: {
    fontSize: "24px",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    background: "#313338",
  },
  formCard: {
    background: "#2b2d31",
    borderRadius: "12px",
    padding: "40px",
    width: "100%",
    maxWidth: "480px",
    animation: "fadeIn 0.5s ease",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#f2f3f5",
    margin: "0 0 8px",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "16px",
    color: "#b5bac1",
    margin: "0 0 32px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#b5bac1",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "16px",
    border: "1px solid #1e1f22",
    borderRadius: "6px",
    background: "#1e1f22",
    color: "#dbdee1",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    background: "#5865f2",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    marginTop: "8px",
  },
  hint: {
    fontSize: "14px",
    color: "#949ba4",
    textAlign: "center",
    marginTop: "4px",
  },
};