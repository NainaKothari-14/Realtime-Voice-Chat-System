import { useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import ChatBox from "../components/ChatBox";
import RemoteAudios from "../components/RemoteAudios";
import { useLocalAudio } from "../hooks/useLocalAudio";
import { useWebRTC } from "../hooks/useWebRTC";

export default function VoiceRoom({ roomId = "general", roomName = "General", onLeave }) {
  const socket = useSocket();

  const myName = (localStorage.getItem("vc_name") || "").trim();

  // room
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingMap, setTypingMap] = useState({});
  const [reactions, setReactions] = useState({});

  // dm
  const [view, setView] = useState("room");
  const [activeDMUser, setActiveDMUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmReactions, setDmReactions] = useState({});

  // ui
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ GLOBAL INCOMING CALL STATE
  const [incomingCall, setIncomingCall] = useState(null); // { from: "username" }

  // voice
  const [muted, setMuted] = useState(false);
  const { stream: localStream } = useLocalAudio();
  const { remoteStreams } = useWebRTC(socket, localStream, users);

  const joined = useMemo(() => users.length > 0, [users.length]);

  // ✅ JOIN GUARD - prevents repeated joins
  const joinedRef = useRef(false);

  // Helper: normalize names for comparison
  const normalizeName = (name) => (name || "").trim().toLowerCase();

  // ✅ REGISTER USER ONLINE STATUS
  useEffect(() => {
    if (!socket || !myName) return;

    socket.emit("user:online", { name: myName });
    console.log("✅ Registered as online:", myName);
  }, [socket, myName]);

  // ✅ JOIN THE SELECTED ROOM (with guard)
  useEffect(() => {
    if (!socket || !roomId || !myName) return;

    if (joinedRef.current) return;
    joinedRef.current = true;

    console.log("🚪 Joining room:", roomId);
    
    socket.emit("room:join", {
      roomId: roomId,
      user: { name: myName },
    });

    return () => {
      console.log("👋 Leaving room:", roomId);
      joinedRef.current = false;
    };
  }, [socket, roomId, myName]);

  // keep mic track synced
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [localStream, muted]);

  // ✅ Track known users for persistent DM list
  const [knownUsers, setKnownUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vc_known_users") || "[]");
    } catch {
      return [];
    }
  });

  // ✅ Update known users
  useEffect(() => {
    const newNames = users
      .map(u => u?.user?.name || u?.name)
      .filter(Boolean)
      .map(n => n.trim());
    
    setKnownUsers(prev => {
      const combined = [...new Set([...prev, ...newNames])];
      const filtered = combined.filter(n => normalizeName(n) !== normalizeName(myName));
      localStorage.setItem("vc_known_users", JSON.stringify(filtered));
      return filtered;
    });
  }, [users, myName]);

  // ✅ LISTEN FOR INCOMING CALLS GLOBALLY
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      console.log("📞 Incoming call received:", data);
      setIncomingCall({ from: data.from });
      
      // Play notification sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjKM0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+mdrzzn0pBSh+zPLaizsIGGS57+mjUBELTKXh8LljHAU2jdXzzn4qBSh+y/PbiTUIGGW78OWdSg8NUqnn8bJfGQlBmtvzzH4pBSV9y/LbjDgHF2W88OScSQ8NUqnn8bJeGAlAmtvzzX8pBSZ+y/PcizsIGGa88OWcSg4NUarn8bJeGQlAmNzzzYArBSV9y/LbjDkHGGS88OScSQ4MUqrm8bFgGglAmNzzzH8qBSV+y/PaiDwIGGW78OWdSg4NUqnn8bJeGAlAmtvzzH4qBSh+yvLbiDwHGGa78OSdSg4NUqnn8bJeGAlBmtzzzH4pBSh+yvLaiDwHGGa78OSdSg4NUqrm8bFgGglBmdzzzH4pBSh+yvLaiDsHGGa88OSdSg4NUqvn8bFeGQlBmdzzzH8pBSh+y/LbiDsHF2a88OSdSg4MUqvm8bFfGQlAmNzzzH4pBSh+y/LbiDsHGGa88OSdSg4NUqvn8bFfGQlBmdzzzX8pBSh+y/LbiDsHGGW88OSdSg4MUqvm8bFfGQlBmdzzzH4pBSh+y/LaiDwHGGa88OWdSg4NUqvn8bFfGQlAmNzzzH4pBSh+y/LaiDwHGGa88OWdSg4NUqvn8bFeGQlBmdzzzH4pBSh+yvLbiDwHGGa88OWdSg4NUqvn8bFeGQlAmdzzzH4pBSh+y/LciDwHGGa88OWdSg4MUqvm8bFfGQlBmdzzzH8pBSh+y/LbiDwHGGa88OScSg4MUqvm8bFfGQlBmdzzzH8pBSh+y/LbiDwHGGa88OScSg4MUqvm8bFfGQlBmdzzzH8pBSh+y/LbiDwHGGa88OScSg4MUqvm8bFfGQlBmdzzzH8pBSh+y/LbiDwHGGa88OScSg4MUqvm8bFfGQ==');
        audio.play().catch(() => {});
      } catch (e) {}
    };

    socket.on("call:incoming", handleIncomingCall);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
    };
  }, [socket]);

  // ✅ ACCEPT GLOBAL INCOMING CALL
  const acceptGlobalCall = () => {
    if (!incomingCall) return;
    
    const callerName = incomingCall.from;
    console.log("✅ Accepting call from:", callerName);
    
    socket.emit("call:accept", { to: callerName });
    
    setView("dm");
    setActiveDMUser(callerName);
    setSidebarOpen(false);
    socket.emit("dm:history", { toUser: callerName });
    setIncomingCall(null);
  };

  // ✅ REJECT GLOBAL INCOMING CALL
  const rejectGlobalCall = () => {
    if (!incomingCall) return;
    
    console.log("❌ Rejecting call from:", incomingCall.from);
    socket.emit("call:reject", { to: incomingCall.from });
    setIncomingCall(null);
  };

  // listeners
  useEffect(() => {
    const onUsers = (list) => setUsers(Array.isArray(list) ? list : []);
    const onHistory = (history) => Array.isArray(history) && setMessages(history);
    const onMessage = (msg) => setMessages((p) => [...p, msg]);

    const onTypingStatus = ({ socketId, user, isTyping }) => {
      setTypingMap((prev) => {
        const next = { ...prev };
        if (isTyping) next[socketId] = user;
        else delete next[socketId];
        return next;
      });
    };

    const onDMHistory = ({ history }) => Array.isArray(history) && setDmMessages(history);
    const onDMMessage = (msg) => setDmMessages((p) => [...p, msg]);

    const onReaction = ({ messageId, emoji, user }) => {
      setReactions((prev) => {
        const msgReacts = prev[messageId] || {};
        const emojiUsers = msgReacts[emoji] || [];
        
        if (emojiUsers.includes(user)) {
          const filtered = emojiUsers.filter(u => u !== user);
          if (filtered.length === 0) {
            const { [emoji]: _, ...rest } = msgReacts;
            if (Object.keys(rest).length === 0) {
              const { [messageId]: __, ...restMsgs } = prev;
              return restMsgs;
            }
            return { ...prev, [messageId]: rest };
          }
          return { ...prev, [messageId]: { ...msgReacts, [emoji]: filtered } };
        } else {
          return {
            ...prev,
            [messageId]: { ...msgReacts, [emoji]: [...emojiUsers, user] }
          };
        }
      });
    };

    const onDMReaction = ({ messageId, emoji, user }) => {
      setDmReactions((prev) => {
        const msgReacts = prev[messageId] || {};
        const emojiUsers = msgReacts[emoji] || [];
        
        if (emojiUsers.includes(user)) {
          const filtered = emojiUsers.filter(u => u !== user);
          if (filtered.length === 0) {
            const { [emoji]: _, ...rest } = msgReacts;
            if (Object.keys(rest).length === 0) {
              const { [messageId]: __, ...restMsgs } = prev;
              return restMsgs;
            }
            return { ...prev, [messageId]: rest };
          }
          return { ...prev, [messageId]: { ...msgReacts, [emoji]: filtered } };
        } else {
          return {
            ...prev,
            [messageId]: { ...msgReacts, [emoji]: [...emojiUsers, user] }
          };
        }
      });
    };

    socket.on("room:users", onUsers);
    socket.on("chat:history", onHistory);
    socket.on("chat:message", onMessage);
    socket.on("chat:typing:status", onTypingStatus);
    socket.on("chat:reaction", onReaction);
    socket.on("dm:history", onDMHistory);
    socket.on("dm:message", onDMMessage);
    socket.on("dm:reaction", onDMReaction);

    return () => {
      socket.off("room:users", onUsers);
      socket.off("chat:history", onHistory);
      socket.off("chat:message", onMessage);
      socket.off("chat:typing:status", onTypingStatus);
      socket.off("chat:reaction", onReaction);
      socket.off("dm:history", onDMHistory);
      socket.off("dm:message", onDMMessage);
      socket.off("dm:reaction", onDMReaction);
    };
  }, [socket]);

  const typingUsers = [...new Set(Object.values(typingMap))].filter(Boolean);
  const typingText = typingUsers.length ? `${typingUsers.join(", ")} typing…` : "";

  const roomUIMessages = messages.map((m) => ({
    ...m,
    time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : "",
  }));

  const dmUIMessages = dmMessages.map((m) => ({
    ...m,
    time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : "",
  }));

  const displayMessages = view === "dm" ? dmUIMessages : roomUIMessages;
  const displayReactions = view === "dm" ? dmReactions : reactions;

  const sendMessage = (text) => {
    if (!joined) return alert("Join a room first");

    if (view === "dm") {
      if (!activeDMUser) return alert("Pick a user to DM");
      if (normalizeName(activeDMUser) === normalizeName(myName)) {
        return alert("You can't DM yourself! 😭");
      }
      socket.emit("dm:send", { toUser: activeDMUser, text });
      return;
    }

    socket.emit("chat:send", { text });
  };

  const sendVoiceMessage = (voiceData) => {
    if (!joined) return alert("Join a room first");

    if (view === "dm") {
      if (!activeDMUser) return alert("Pick a user to DM");
      if (normalizeName(activeDMUser) === normalizeName(myName)) {
        return alert("You can't DM yourself! 😭");
      }
      socket.emit("dm:send:voice", { toUser: activeDMUser, ...voiceData });
      return;
    }

    socket.emit("chat:send:voice", voiceData);
  };

  const handleReact = (messageId, emoji) => {
    if (!joined) return;

    if (view === "dm") {
      if (!activeDMUser) return;
      socket.emit("dm:react", { toUser: activeDMUser, messageId, emoji });
      return;
    }

    socket.emit("chat:react", { messageId, emoji });
  };

  const setTyping = (isTyping) => {
    if (!joined) return;
    if (view !== "room") return;
    socket.emit("chat:typing", { isTyping });
  };

  const openDM = (name) => {
    if (!name) return;
    
    if (normalizeName(name) === normalizeName(myName)) {
      return alert("You can't DM yourself! 😭");
    }
    
    setView("dm");
    setActiveDMUser(name);
    setDmMessages([]);
    setSidebarOpen(false);
    socket.emit("dm:history", { toUser: name });
  };

  const openRoom = () => {
    setView("room");
    setActiveDMUser(null);
    setSidebarOpen(false);
  };

  const toggleMute = () => {
    if (!localStream) return alert("Mic not ready yet");

    setMuted((prev) => {
      const next = !prev;
      socket.emit("presence:mute", { muted: next });
      return next;
    });
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to leave the room?")) {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      socket.emit("room:leave");

      setUsers([]);
      setMessages([]);
      setTypingMap({});
      setReactions({});
      setDmMessages([]);
      setDmReactions({});
      setView("room");
      setActiveDMUser(null);
      setIncomingCall(null);

      setTimeout(() => {
        socket.disconnect();
        onLeave?.();
      }, 150);
    }
  };

  const onlineUsersSet = useMemo(() => {
    const names = users
      .map((u) => u?.user?.name || u?.name)
      .filter(Boolean)
      .map((n) => (n || "").trim().toLowerCase());
    return new Set(names);
  }, [users]);

  const isUserOnline = (name) =>
    onlineUsersSet.has((name || "").trim().toLowerCase());

  const dmUsers = useMemo(() => {
    const allUsers = [...new Set([...knownUsers, ...Array.from(onlineUsersSet)])];
    return allUsers.filter(n => normalizeName(n) !== normalizeName(myName));
  }, [knownUsers, onlineUsersSet, myName]);

  return (
    <div className="appShell">
      {incomingCall && (
        <div className="globalCallNotification">
          <div className="callNotificationCard">
            <div className="callNotificationHeader">
              <div className="callingIcon">📞</div>
              <div className="callNotificationInfo">
                <div className="callNotificationTitle">Incoming Call</div>
                <div className="callNotificationCaller">@{incomingCall.from}</div>
              </div>
            </div>
            <div className="callNotificationActions">
              <button className="acceptCallBtn" onClick={acceptGlobalCall}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                </svg>
                Accept
              </button>
              <button className="rejectCallBtn" onClick={rejectGlobalCall}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="serverBar">
        <div className={`serverDot ${view === "room" ? "active" : ""}`} onClick={openRoom}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </div>
        <div className="serverDot add">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </div>
      </div>

      {sidebarOpen ? <div className="backdrop" onClick={() => setSidebarOpen(false)} /> : null}

      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebarHeader">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 8}}>
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
          VoiceChat
        </div>

        <div className="sidebarScroll">
          <div className="sectionLabel">TEXT CHANNELS</div>
          <div className={`userItem channelItem ${view === "room" ? "active" : ""}`} onClick={openRoom}>
            <div className="channelIcon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 13h14v-2H5v2zm0 4h14v-2H5v2zM5 7v2h14V7H5z"/>
              </svg>
            </div>
            <div className="userName">{roomName}</div>
          </div>

          <div className="sectionLabel">DIRECT MESSAGES</div>
          {dmUsers.length === 0 && (
            <div style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: "13px" }}>
              No users available
            </div>
          )}
          {dmUsers.map((name) => {
            const isOnline = isUserOnline(name);
            const isActive = view === "dm" && normalizeName(activeDMUser) === normalizeName(name);
            
            return (
              <div
                className={`userItem ${isActive ? "active" : ""}`}
                key={name}
                onClick={() => openDM(name)}
              >
                <div className="avatar">
                  {name.slice(0, 2).toUpperCase()}
                  <div className={`statusDot ${isOnline ? "online" : "offline"}`} />
                </div>
                <div className="userMeta">
                  <div className="userName">{name}</div>
                  <div className="userStatus">
                    {isActive ? "Active" : isOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="voicePanel">
          <div className="voiceHeader">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 12c0 2.76-2.24 5-5 5s-5-2.24-5-5h-2c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <span style={{marginLeft: 8}}>Voice Connected</span>
          </div>
          
          <div className="voiceStatus">
            {localStream ? (
              muted ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ed4245">
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  </svg>
                  <span style={{color: "#ed4245", marginLeft: 6}}>Muted</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#3ba55d">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  </svg>
                  <span style={{color: "#3ba55d", marginLeft: 6}}>Connected</span>
                </>
              )
            ) : (
              <span style={{color: "#faa81a"}}>Connecting...</span>
            )}
          </div>

          <div className="voiceControls">
            <button className="voiceBtn" onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                {muted ? (
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                ) : (
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                )}
              </svg>
            </button>

            <button 
              className="voiceBtn" 
              onClick={handleDisconnect} 
              title="Leave Room"
              style={{background: 'var(--danger)'}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          </div>

          <RemoteAudios remoteStreams={remoteStreams} />
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <button className="menuBtn" onClick={() => setSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>

          <div className="channelInfo">
            {view === "room" ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 8}}>
                  <path d="M5 13h14v-2H5v2zm0 4h14v-2H5v2zM5 7v2h14V7H5z"/>
                </svg>
                <span className="channelTitle">{roomName}</span>
              </>
            ) : (
              <>
                <div className="avatar small">
                  {(activeDMUser || "?").slice(0, 2).toUpperCase()}
                  <div className={`statusDot ${isUserOnline(activeDMUser) ? "online" : "offline"}`} />
                </div>
                <span className="channelTitle">{activeDMUser || "dm"}</span>
              </>
            )}
          </div>

          <div className="currentUserBadge">
            <div className="avatar tiny">
              {myName.slice(0, 2).toUpperCase()}
            </div>
            <span className="currentUserName">{myName}</span>
          </div>

          <button className="voiceBtn topbar-disconnect" onClick={handleDisconnect} title="Leave Room">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>

        <ChatBox
          socket={socket}
          messages={displayMessages}
          onSend={sendMessage}
          onSendVoice={sendVoiceMessage}  
          onTyping={view === "room" ? setTyping : undefined}
          typingText={view === "room" ? typingText : ""}
          onReact={handleReact}
          reactions={displayReactions}
          isDM={view === "dm"}
          dmUser={activeDMUser || ""}
          myName={myName}
        />
      </div>

      <style>{`
        /* ============================================
        VOICE CHAT - COMPLETE UI STYLESHEET
        Production-ready, copy-paste solution
        Fixes: Recording indicator, timestamps, contrast, spacing
        ============================================ */
     
     /* ============================================
        CSS VARIABLES
        ============================================ */
     :root {
       /* Brand Colors */
       --primary: #5865f2;
       --primary-hover: #4752c4;
       --primary-dark: #3c45a5;
       
       /* Status Colors */
       --success: #2ea043;
       --success-hover: #26843a;
       --danger: #d73a49;
       --danger-hover: #c12838;
       --warning: #faa81a;
       --online: #3ba55d;
       --offline: #80848e;
       
       /* Background Layers */
       --bg-primary: #313338;
       --bg-secondary: #2b2d31;
       --bg-tertiary: #1e1f22;
       --bg-elevated: #383a40;
       --bg-modifier-hover: rgba(79, 84, 92, 0.16);
       --bg-modifier-active: rgba(79, 84, 92, 0.24);
       
       /* Text Colors */
       --text-primary: #f2f3f5;
       --text-secondary: #b5bac1;
       --text-muted: #80848e;
       --text-link: #00a8fc;
       
       /* Message Bubbles */
       --bubble-sent: #5865f2;
       --bubble-received: rgba(255, 255, 255, 0.06);
       --bubble-received-border: rgba(255, 255, 255, 0.12);
       
       /* Borders & Dividers */
       --border-color: rgba(255, 255, 255, 0.08);
       --border-subtle: rgba(255, 255, 255, 0.04);
       
       /* Shadows */
       --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
       --shadow-md: 0 4px 8px 0 rgba(0, 0, 0, 0.3);
       --shadow-lg: 0 8px 16px 0 rgba(0, 0, 0, 0.4);
       
       /* Spacing */
       --spacing-xs: 4px;
       --spacing-sm: 8px;
       --spacing-md: 12px;
       --spacing-lg: 16px;
       --spacing-xl: 20px;
       
       /* Border Radius */
       --radius-sm: 4px;
       --radius-md: 8px;
       --radius-lg: 12px;
       --radius-xl: 16px;
       --radius-full: 9999px;
       
       /* Z-index Layers */
       --z-base: 1;
       --z-dropdown: 1000;
       --z-modal: 5000;
       --z-notification: 10000;
     }
     
     /* ============================================
        GLOBAL RESET
        ============================================ */
     * {
       margin: 0;
       padding: 0;
       box-sizing: border-box;
     }
     
     body {
       font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
       background: var(--bg-primary);
       color: var(--text-primary);
       overflow: hidden;
       -webkit-font-smoothing: antialiased;
       -moz-osx-font-smoothing: grayscale;
     }
     
     /* ============================================
        LAYOUT - APP SHELL
        ============================================ */
     .appShell {
       display: flex;
       height: 100vh;
       width: 100vw;
       overflow: hidden;
     }
     
     /* ============================================
        SERVER BAR (Left sidebar)
        ============================================ */
     .serverBar {
       width: 72px;
       background: var(--bg-tertiary);
       display: flex;
       flex-direction: column;
       align-items: center;
       padding: 12px 0;
       gap: 8px;
       overflow-y: auto;
       flex-shrink: 0;
     }
     
     .serverBar::-webkit-scrollbar {
       width: 0;
     }
     
     .serverDot {
       width: 48px;
       height: 48px;
       border-radius: 50%;
       background: var(--bg-primary);
       display: flex;
       align-items: center;
       justify-content: center;
       cursor: pointer;
       transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
       position: relative;
       color: var(--text-secondary);
     }
     
     .serverDot::before {
       content: '';
       position: absolute;
       left: -12px;
       width: 0;
       height: 0;
       background: white;
       border-radius: 0 4px 4px 0;
       transition: all 0.2s;
     }
     
     .serverDot:hover {
       border-radius: 16px;
       background: var(--primary);
       color: white;
     }
     
     .serverDot:hover::before {
       width: 4px;
       height: 20px;
     }
     
     .serverDot.active {
       border-radius: 16px;
       background: var(--primary);
       color: white;
     }
     
     .serverDot.active::before {
       width: 4px;
       height: 40px;
     }
     
     .serverDot.add {
       background: transparent;
       border: 2px dashed var(--border-color);
       color: var(--success);
     }
     
     .serverDot.add:hover {
       background: var(--success);
       border-color: var(--success);
       color: white;
     }
     
     /* ============================================
        SIDEBAR (Channel list)
        ============================================ */
     .sidebar {
       width: 240px;
       background: var(--bg-secondary);
       display: flex;
       flex-direction: column;
       flex-shrink: 0;
       transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
     }
     
     .backdrop {
       display: none;
     }
     
     @media (max-width: 768px) {
       .sidebar {
         position: fixed;
         left: 0;
         top: 0;
         bottom: 0;
         z-index: 999;
         transform: translateX(-100%);
       }
       
       .sidebar.open {
         transform: translateX(0);
       }
       
       .backdrop {
         display: block;
         position: fixed;
         inset: 0;
         background: rgba(0, 0, 0, 0.7);
         z-index: 998;
         animation: fadeIn 0.2s;
       }
       
       .serverBar {
         display: none;
       }
     }
     
     .sidebarHeader {
       padding: 16px;
       border-bottom: 1px solid var(--border-color);
       font-weight: 700;
       font-size: 16px;
       display: flex;
       align-items: center;
       color: var(--text-primary);
       cursor: pointer;
       transition: background 0.15s;
     }
     
     .sidebarHeader:hover {
       background: var(--bg-modifier-hover);
     }
     
     .sidebarScroll {
       flex: 1;
       overflow-y: auto;
       padding: 8px;
     }
     
     .sidebarScroll::-webkit-scrollbar {
       width: 8px;
     }
     
     .sidebarScroll::-webkit-scrollbar-track {
       background: transparent;
     }
     
     .sidebarScroll::-webkit-scrollbar-thumb {
       background: var(--bg-tertiary);
       border-radius: 4px;
     }
     
     .sidebarScroll::-webkit-scrollbar-thumb:hover {
       background: var(--bg-elevated);
     }
     
     .sectionLabel {
       padding: 8px 8px 4px;
       font-size: 11px;
       font-weight: 700;
       color: var(--text-muted);
       text-transform: uppercase;
       letter-spacing: 0.5px;
     }
     
     .userItem {
       display: flex;
       align-items: center;
       padding: 8px;
       border-radius: var(--radius-md);
       cursor: pointer;
       transition: background 0.15s;
       gap: 12px;
       margin: 2px 0;
     }
     
     .userItem:hover {
       background: var(--bg-modifier-hover);
     }
     
     .userItem.active {
       background: var(--bg-modifier-active);
       color: white;
     }
     
     .channelItem {
       color: var(--text-secondary);
     }
     
     .channelItem:hover,
     .channelItem.active {
       color: var(--text-primary);
     }
     
     .channelIcon {
       width: 24px;
       height: 24px;
       display: flex;
       align-items: center;
       justify-content: center;
       color: inherit;
     }
     
     .avatar {
       width: 32px;
       height: 32px;
       border-radius: 50%;
       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
       display: flex;
       align-items: center;
       justify-content: center;
       font-weight: 700;
       font-size: 12px;
       color: white;
       flex-shrink: 0;
       position: relative;
     }
     
     .avatar.small {
       width: 28px;
       height: 28px;
       font-size: 11px;
     }
     
     .statusDot {
       position: absolute;
       bottom: -2px;
       right: -2px;
       width: 12px;
       height: 12px;
       border-radius: 50%;
       border: 3px solid var(--bg-secondary);
       background: var(--offline);
     }
     
     .statusDot.online {
       background: var(--online);
     }
     
     .userMeta {
       flex: 1;
       min-width: 0;
     }
     
     .userName {
       font-size: 14px;
       font-weight: 500;
       color: var(--text-primary);
       overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;
     }
     
     .userStatus {
       font-size: 12px;
       color: var(--text-muted);
     }
     
     /* ============================================
        VOICE PANEL (Bottom of sidebar)
        ============================================ */
     .voicePanel {
       background: var(--bg-tertiary);
       border-top: 1px solid var(--border-color);
       padding: 12px;
     }
     
     .voiceHeader {
       display: flex;
       align-items: center;
       font-size: 13px;
       font-weight: 600;
       color: var(--text-secondary);
       margin-bottom: 8px;
     }
     
     .voiceStatus {
       display: flex;
       align-items: center;
       font-size: 12px;
       padding: 6px 8px;
       background: rgba(0, 0, 0, 0.2);
       border-radius: var(--radius-md);
       margin-bottom: 8px;
     }
     
     .voiceControls {
       display: flex;
       gap: 8px;
     }
     
     .voiceBtn {
       flex: 1;
       padding: 10px;
       border: none;
       border-radius: var(--radius-md);
       background: var(--bg-elevated);
       color: var(--text-primary);
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       transition: all 0.15s;
     }
     
     .voiceBtn:hover {
       background: var(--bg-modifier-hover);
     }
     
     .voiceBtn:active {
       transform: scale(0.95);
     }
     
     /* ============================================
        MAIN CONTENT AREA
        ============================================ */
     .main {
       flex: 1;
       display: flex;
       flex-direction: column;
       background: var(--bg-primary);
       min-width: 0;
     }
     
     .topbar {
       height: 56px;
       border-bottom: 1px solid var(--border-color);
       display: flex;
       align-items: center;
       padding: 0 16px;
       gap: 12px;
       flex-shrink: 0;
       background: var(--bg-primary);
     }
     
     .menuBtn {
       display: none;
       width: 40px;
       height: 40px;
       border: none;
       background: transparent;
       color: var(--text-secondary);
       border-radius: var(--radius-md);
       cursor: pointer;
       transition: all 0.15s;
     }
     
     .menuBtn:hover {
       background: var(--bg-modifier-hover);
       color: var(--text-primary);
     }
     
     @media (max-width: 768px) {
       .menuBtn {
         display: flex;
         align-items: center;
         justify-content: center;
       }
     }
     
     .channelInfo {
       display: flex;
       align-items: center;
       gap: 8px;
       flex: 1;
       min-width: 0;
     }
     
     .channelTitle {
       font-size: 16px;
       font-weight: 700;
       color: var(--text-primary);
       overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;
     }
     
     /* ============================================
        CHAT AREA
        ============================================ */
     .chatArea {
       flex: 1;
       overflow-y: auto;
       padding: 16px;
       display: flex;
       flex-direction: column;
       gap: 4px;
     }
     
     .chatArea::-webkit-scrollbar {
       width: 16px;
     }
     
     .chatArea::-webkit-scrollbar-track {
       background: transparent;
       border-left: 4px solid transparent;
       border-right: 4px solid transparent;
       background-clip: padding-box;
     }
     
     .chatArea::-webkit-scrollbar-thumb {
       background: var(--bg-tertiary);
       border: 4px solid transparent;
       border-radius: 8px;
       background-clip: padding-box;
       min-height: 40px;
     }
     
     .chatArea::-webkit-scrollbar-thumb:hover {
       background: var(--bg-elevated);
       border: 4px solid transparent;
       background-clip: padding-box;
     }
     
     /* System Messages */
     .systemMsg {
       display: flex;
       align-items: center;
       gap: 12px;
       margin: 16px 0;
       opacity: 0.5;
     }
     
     .systemLine {
       flex: 1;
       height: 1px;
       background: var(--border-color);
     }
     
     .systemText {
       font-size: 12px;
       color: var(--text-muted);
       font-weight: 500;
       white-space: nowrap;
     }
     
     /* Chat Messages */
     .chatRow {
       display: flex;
       gap: 12px;
       margin-bottom: 8px;
       animation: slideIn 0.2s ease-out;
     }
     
     @keyframes slideIn {
       from {
         opacity: 0;
         transform: translateY(8px);
       }
       to {
         opacity: 1;
         transform: translateY(0);
       }
     }
     
     .chatRow.me {
       flex-direction: row-reverse;
     }
     
     .chatContent {
       flex: 1;
       min-width: 0;
       display: flex;
       flex-direction: column;
       gap: 2px;
     }
     
     .chatRow.me .chatContent {
       align-items: flex-end;
     }
     
     .chatMeta {
       display: flex;
       align-items: baseline;
       gap: 8px;
       padding: 0 4px;
       margin-bottom: 2px;
     }
     
     .chatName {
       font-size: 14px;
       font-weight: 600;
       color: var(--text-primary);
     }
     
     /* ✅ FIX: Timestamps - MUCH BETTER VISIBILITY */
     .msgTime {
       font-size: 12px;
       font-weight: 500;
       color: rgba(255, 255, 255, 0.5) !important; /* High contrast */
       margin-left: 6px;
     }
     
     .chatBubble {
       padding: 10px 14px;
       border-radius: var(--radius-lg);
       max-width: 70%;
       word-wrap: break-word;
       position: relative;
     }
     
     /* ✅ FIX: Message Bubbles - BETTER CONTRAST */
     .myBubble {
       background: var(--bubble-sent) !important;
       color: white !important;
       border-bottom-right-radius: 4px;
     }
     
     .otherBubble {
       background: var(--bubble-received) !important;
       border: 1px solid var(--bubble-received-border) !important;
       color: var(--text-primary) !important;
       border-bottom-left-radius: 4px;
     }
     
     .chatText {
       font-size: 15px;
       line-height: 1.5;
       white-space: pre-wrap;
     }
     
     /* ✅ FIX: My message timestamps - CLEARLY VISIBLE */
     .myTime {
       display: block;
       text-align: right;
       margin-top: 4px;
       font-size: 11px;
       color: rgba(255, 255, 255, 0.7) !important;
       font-weight: 500;
     }
     
     .chatAvatar {
       width: 40px;
       height: 40px;
       flex-shrink: 0;
     }
     
     .myAvatar {
       background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
     }
     
     /* Reactions */
     .reactionsDisplay {
       display: flex;
       flex-wrap: wrap;
       gap: 4px;
       margin-top: 4px;
     }
     
     .reactionBubble {
       display: flex;
       align-items: center;
       gap: 4px;
       padding: 4px 8px;
       border-radius: 12px;
       background: var(--bg-modifier-hover);
       border: 1px solid var(--border-color);
       cursor: pointer;
       transition: all 0.15s;
       font-size: 13px;
     }
     
     .reactionBubble:hover {
       background: var(--bg-modifier-active);
       transform: scale(1.05);
     }
     
     .reactionBubble.myReaction {
       background: rgba(88, 101, 242, 0.2);
       border-color: var(--primary);
     }
     
     .reactionEmoji {
       font-size: 14px;
     }
     
     .reactionCount {
       font-size: 12px;
       font-weight: 600;
       color: var(--text-secondary);
     }
     
     .addReaction {
       display: flex;
       gap: 4px;
       margin-top: 4px;
       opacity: 0;
       transition: opacity 0.15s;
     }
     
     .chatRow:hover .addReaction {
       opacity: 1;
     }
     
     .quickReact {
       width: 24px;
       height: 24px;
       border: none;
       background: var(--bg-modifier-hover);
       border-radius: 50%;
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 14px;
       transition: all 0.15s;
     }
     
     .quickReact:hover {
       background: var(--bg-modifier-active);
       transform: scale(1.1);
     }
     
     /* Voice Messages */
     .voiceMessage {
       display: flex;
       align-items: center;
       gap: 12px;
       min-width: 200px;
     }
     
     .voicePlayBtn {
       width: 36px;
       height: 36px;
       border-radius: 50%;
       background: rgba(255, 255, 255, 0.1);
       border: none;
       color: white;
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 14px;
       transition: all 0.15s;
       flex-shrink: 0;
     }
     
     .voicePlayBtn:hover {
       background: rgba(255, 255, 255, 0.2);
       transform: scale(1.05);
     }
     
     .voiceWaveform {
       flex: 1;
       min-width: 0;
     }
     
     .voiceDuration {
       font-size: 12px;
       color: rgba(255, 255, 255, 0.7);
       margin-bottom: 4px;
       font-weight: 500;
     }
     
     .waveformBars {
       display: flex;
       align-items: flex-end;
       gap: 2px;
       height: 24px;
     }
     
     .waveBar {
       flex: 1;
       background: rgba(255, 255, 255, 0.3);
       border-radius: 2px;
       min-width: 2px;
     }
     
     /* ============================================
        CHAT COMPOSER
        ============================================ */
     .chatComposer {
       padding: 16px;
       background: var(--bg-primary);
       flex-shrink: 0;
     }
     
     .emojiBar {
       display: flex;
       gap: 4px;
       margin-bottom: 8px;
       flex-wrap: wrap;
     }
     
     .emojiBtn {
       width: 32px;
       height: 32px;
       border: none;
       background: var(--bg-modifier-hover);
       border-radius: var(--radius-md);
       cursor: pointer;
       font-size: 18px;
       display: flex;
       align-items: center;
       justify-content: center;
       transition: all 0.15s;
     }
     
     .emojiBtn:hover {
       background: var(--bg-modifier-active);
       transform: scale(1.1);
     }
     
     /* ✅ FIX: Recording Bar - HIGHLY VISIBLE */
     .recordingBar {
       display: flex;
       align-items: center;
       gap: 12px;
       padding: 12px 16px;
       background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15));
       border: 2px solid rgba(239, 68, 68, 0.4) !important;
       border-radius: var(--radius-lg);
       animation: glow 2s ease-in-out infinite;
     }
     
     @keyframes glow {
       0%, 100% {
         box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
       }
       50% {
         box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
       }
     }
     
     .recordingInfo {
       flex: 1;
       display: flex;
       align-items: center;
       justify-content: center;
     }
     
     /* ✅ FIX: Recording Indicator - SUPER VISIBLE */
     .recordingIndicator {
       display: flex;
       align-items: center;
       gap: 12px;
     }
     
     .recordingDot {
       width: 16px !important;
       height: 16px !important;
       background: #ef4444 !important;
       border-radius: 50%;
       animation: pulseRec 1.5s ease-in-out infinite !important;
       box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
     }
     
     @keyframes pulseRec {
       0%, 100% {
         transform: scale(1);
         box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
       }
       50% {
         transform: scale(1.2);
         box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
       }
     }
     
     .recordingTime {
       font-size: 18px !important;
       font-weight: 700 !important;
       color: #ef4444 !important;
       font-variant-numeric: tabular-nums;
       letter-spacing: 1px;
     }
     
     .cancelRecordBtn,
     .sendRecordBtn {
       width: 44px;
       height: 44px;
       border-radius: 50%;
       border: none;
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 20px;
       font-weight: 700;
       transition: all 0.15s;
     }
     
     .cancelRecordBtn {
       background: rgba(255, 255, 255, 0.1);
       color: #ef4444;
     }
     
     .cancelRecordBtn:hover {
       background: rgba(239, 68, 68, 0.2);
       transform: scale(1.1);
     }
     
     .sendRecordBtn {
       background: var(--success);
       color: white;
     }
     
     .sendRecordBtn:hover {
       background: var(--success-hover);
       transform: scale(1.1);
     }
     
     .composerBox {
       display: flex;
       align-items: center;
       gap: 8px;
       padding: 12px 16px;
       background: var(--bg-elevated);
       border-radius: var(--radius-lg);
     }
     
     .attachBtn,
     .voiceRecordBtn {
       width: 40px;
       height: 40px;
       border: none;
       background: transparent;
       color: var(--text-secondary);
       border-radius: var(--radius-md);
       cursor: pointer;
       font-size: 20px;
       display: flex;
       align-items: center;
       justify-content: center;
       transition: all 0.15s;
       flex-shrink: 0;
     }
     
     .attachBtn:hover,
     .voiceRecordBtn:hover {
       background: var(--bg-modifier-hover);
       color: var(--text-primary);
     }
     
     .composerInput {
       flex: 1;
       background: transparent;
       border: none;
       outline: none;
       color: var(--text-primary);
       font-size: 15px;
       font-family: inherit;
     }
     
     .composerInput::placeholder {
       color: var(--text-muted);
     }
     
     .sendBtn {
       width: 40px;
       height: 40px;
       border-radius: 50%;
       border: none;
       background: var(--primary);
       color: white;
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 18px;
       font-weight: 700;
       transition: all 0.15s;
       flex-shrink: 0;
     }
     
     .sendBtn:hover {
       background: var(--primary-hover);
       transform: scale(1.05);
     }
     
     .sendBtn:active {
       transform: scale(0.95);
     }
     
     .typingLine {
       margin-top: 8px;
       font-size: 13px;
       color: var(--text-muted);
       font-style: italic;
       padding-left: 4px;
     }
     
     /* ============================================
        RESPONSIVE - MOBILE
        ============================================ */
     @media (max-width: 768px) {
       .chatBubble {
         max-width: 85%;
       }
       
       .emojiBar {
         gap: 2px;
       }
       
       .emojiBtn {
         width: 28px;
         height: 28px;
         font-size: 16px;
       }
       
       .chatArea {
         padding: 12px;
       }
       
       .chatComposer {
         padding: 12px;
       }
       
       .topbar {
         padding: 0 12px;
       }
     }
     
     /* ============================================
        ANIMATIONS
        ============================================ */
     @keyframes fadeIn {
       from {
         opacity: 0;
       }
       to {
         opacity: 1;
       }
     }
     
     @keyframes slideUp {
       from {
         transform: translateY(20px);
         opacity: 0;
       }
       to {
         transform: translateY(0);
         opacity: 1;
       }
     }
     
     /* ============================================
        UTILITY CLASSES
        ============================================ */
     .hidden {
       display: none !important;
     }
     
     .invisible {
       visibility: hidden !important;
     }
     
     .fadeIn {
       animation: fadeIn 0.2s ease-in;
     }
     
     .slideUp {
       animation: slideUp 0.3s ease-out;
      }
       
      `}</style>
    </div>
  );
}