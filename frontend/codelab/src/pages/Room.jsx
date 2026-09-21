import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useApp } from "../context/AppContext";
import { socketService } from "../services/socketService";
import { Button } from "../components/common/UI";
import {
  Code2,
  Play,
  Settings,
  Copy,
  Terminal as TerminalIcon,
  FileCode,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const storedUser = JSON.parse(localStorage.getItem("codelab_user"));

  const currentUserId = storedUser?.id;

  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState("");

  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalTab, setTerminalTab] = useState("output"); // output, console, tests
  const [isRunning, setIsRunning] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [executionOutput, setExecutionOutput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUsersOpen, setOnlineUsersOpen] = useState(false);
  const [compareVersion, setCompareVersion] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const token = localStorage.getItem("codelab_token");

        if (!token) {
          addToast("Please log in again", "error");
          navigate("/login");
          return;
        }

        // Get room information
        const roomResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const roomData = await roomResponse.json();

        if (!roomResponse.ok) {
          throw new Error(roomData.message || "Failed to load room");
        }

        setRoom(roomData.room);

        // Get files belonging to this room
        const filesResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/files/room/${roomCode}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const filesData = await filesResponse.json();

        if (!filesResponse.ok) {
          throw new Error(filesData.message || "Failed to load files");
        }

        setFiles(filesData.files);

        // Select first file automatically
        if (filesData.files.length > 0) {
          setActiveFile(filesData.files[0]);
          setCode(filesData.files[0].content);
        }
      } catch (error) {
        console.error(error);
        addToast(error.message, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomCode, addToast, navigate]);
  //online users active status
  useEffect(() => {
    if (!roomCode) return;

    const cleanupOnlineUsers = socketService.connect(roomCode, (users) => {
      setOnlineUsers(users);
    });

    return () => {
      cleanupOnlineUsers?.();
      socketService.disconnect();
    };
  }, [roomCode]);
  //oncode changes
  useEffect(() => {
    const cleanup = socketService.onCodeChange(({ code, fileId }) => {
      if (!activeFile) return;

      if (fileId !== activeFile.id) return;

      setCode(code);

      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, content: code } : file,
        ),
      );
    });
    return cleanup;
  }, [activeFile]);
  //message history loading
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const token = localStorage.getItem("codelab_token");

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load messages");
        }

        const storedUser = JSON.parse(localStorage.getItem("codelab_user"));

        const currentUserId = storedUser?.id;

        const formattedMessages = data.messages.map((message) => ({
          id: message.id,
          user: message.user_id === currentUserId ? "You" : message.username,
          text: message.content,
          time: new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    if (roomCode) {
      loadMessages();
    }
  }, [roomCode]);
  //onmessage
  useEffect(() => {
    const cleanup = socketService.onMessage((messageData) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: messageData.id || Date.now(),
          user: messageData.username || "User",
          text: messageData.content,
          time:
            messageData.time ||
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        },
      ]);
    });

    return cleanup;
  }, []);
  //onFilecreated
  useEffect(() => {
    const cleanup = socketService.onFileCreated((newFile) => {
      setFiles((prevFiles) => {
        if (prevFiles.some((file) => file.id === newFile.id)) {
          return prevFiles;
        }

        return [...prevFiles, newFile];
      });
    });

    return cleanup;
  }, []);
  //onfilerenamed
  useEffect(() => {
    const cleanup = socketService.onFileRenamed((renamedFile) => {
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === renamedFile.id ? renamedFile : file,
        ),
      );

      if (activeFile?.id === renamedFile.id) {
        setActiveFile(renamedFile);
      }
    });

    return cleanup;
  }, [activeFile]);
  //onfiledeleted
  useEffect(() => {
    const cleanup = socketService.onFileDeleted((deletedFileId) => {
      console.log("Received file-deleted:", deletedFileId);

      setFiles((prevFiles) => {
        const remainingFiles = prevFiles.filter(
          (file) => file.id !== deletedFileId,
        );

        return remainingFiles;
      });

      if (activeFile?.id === deletedFileId) {
        setActiveFile(null);
        setCode("");
      }
    });

    return cleanup;
  }, [activeFile]);
  const handleEditorChange = (value) => {
    setCode(value);

    if (!activeFile) return;

    // Send changes to other users immediately
    socketService.sendCodeUpdate(roomCode, activeFile.id, value);

    // Cancel the previous save timer
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    // Save after the user stops typing for 1 second
    saveTimer.current = setTimeout(() => {
      handleSaveFile(value, false);
    }, 1000);
  };
  const handleSaveFile = async (codeToSave = code, showToast = true) => {
    if (!activeFile) {
      addToast("No file selected", "error");
      return;
    }

    try {
      const token = localStorage.getItem("codelab_token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/files/${activeFile.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: codeToSave,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save file");
      }

      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === activeFile.id ? { ...file, content: codeToSave } : file,
        ),
      );

      setActiveFile((prev) => ({
        ...prev,
        content: codeToSave,
      }));

      if (showToast) {
        addToast("File saved successfully", "success");
      }
    } catch (error) {
      console.error(error);
      addToast(error.message, "error");
    }
  };
  const loadHistory = async () => {
    if (!activeFile) return;

    try {
      setLoadingHistory(true);

      const token = localStorage.getItem("codelab_token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/files/${activeFile.id}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      console.log("History API response:", data);
      if (!response.ok) {
        throw new Error(data.message || "Failed to load history");
      }

      setHistory(data.history || []);
    } catch (error) {
      console.error("History error:", error);
      addToast(error.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };
  const handleFileSelect = (file) => {
    setActiveFile(file);
    setCode(file.content);
  };
  const handleCreateFile = async () => {
    const filename = prompt("Enter file name:");

    if (!filename || !filename.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem("codelab_token");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/files/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomCode,
          filename: filename.trim(),
          language: "javascript",
          content: "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create file");
      }

      const newFile = data.file;

      setFiles((prevFiles) => [...prevFiles, newFile]);

      setActiveFile(newFile);
      setCode(newFile.content);
      socketService.createFile(roomCode, newFile);
      addToast("File created successfully", "success");
    } catch (error) {
      console.error(error);
      addToast(error.message, "error");
    }
  };
  const handleRenameFile = async (file) => {
    const newFilename = prompt("Enter new file name:", file.filename);

    if (!newFilename || !newFilename.trim()) {
      return;
    }

    if (newFilename.trim() === file.filename) {
      return;
    }

    try {
      const token = localStorage.getItem("codelab_token");

      const response = await fetch(
       `${import.meta.env.VITE_API_URL}/api/files/${file.id}/rename`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: newFilename.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to rename file");
      }

      const renamedFile = data.file;

      setFiles((prevFiles) =>
        prevFiles.map((item) => (item.id === file.id ? renamedFile : item)),
      );

      if (activeFile?.id === file.id) {
        setActiveFile(renamedFile);
      }
      socketService.renameFile(roomCode, renamedFile);
      addToast("File renamed successfully", "success");
    } catch (error) {
      console.error(error);
      addToast(error.message, "error");
    }
  };
  const handleDeleteFile = async (file) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.filename}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("codelab_token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/files/${file.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete file");
      }

      // Calculate the remaining files BEFORE updating state
      const remainingFiles = files.filter((item) => item.id !== file.id);

      // Update local file list
      setFiles(remainingFiles);

      // If the deleted file was active, select another file
      if (activeFile?.id === file.id) {
        if (remainingFiles.length > 0) {
          const nextFile = remainingFiles[0];
          setActiveFile(nextFile);
          setCode(nextFile.content || "");
        } else {
          setActiveFile(null);
          setCode("");
        }
      }

      // Notify other users AFTER successful database deletion
      socketService.deleteFile(roomCode, file.id);

      addToast("File deleted successfully", "success");
    } catch (error) {
      console.error(error);
      addToast(error.message, "error");
    }
  };
  const runCode = async () => {
    if (!code.trim()) {
      setTerminalOpen(true);
      setTerminalTab("output");
      setExecutionOutput("No code to execute.");
      return;
    }

    setIsRunning(true);
    setTerminalOpen(true);
    setTerminalTab("output");
    setExecutionOutput("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("codelab_token")}`,
        },
        body: JSON.stringify({
          code: code,
        }),
      });

      const data = await response.json();

      console.log("Execution result:", data);

      // Show both normal output and execution errors
      setExecutionOutput(
        data.output || data.error || data.message || "No output",
      );

      if (!response.ok) {
        addToast(data.message || "Code execution failed", "error");
        return;
      }

      addToast(
        data.success ? "Code executed successfully" : "Code execution failed",
        data.success ? "success" : "error",
      );
    } catch (error) {
      console.error("Execution error:", error);

      setExecutionOutput("Failed to connect to the code execution server.");

      addToast("Failed to execute code", "error");
    } finally {
      setIsRunning(false);
    }
  };
  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages([
      ...messages,
      {
        id: Date.now(),
        user: "You",
        text: chatInput,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setChatInput("");
    socketService.sendMessage(roomCode, chatInput);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
      }}
    >
      {/* Room Header */}
      <header
        className="room-header flex justify-between items-center"
        style={{
          height: "56px",
          padding: "0 1rem",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        <div className="flex items-center gap-4">
          <button
            className="btn-ghost btn-sm hide-mobile"
            onClick={() => navigate("/dashboard")}
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Code2 size={20} color="var(--primary)" />
            <span style={{ fontWeight: "600" }}>CodeLab</span>
          </div>
          <div
            style={{
              width: "1px",
              height: "20px",
              background: "var(--border-color)",
              margin: "0 0.5rem",
            }}
          ></div>
          <span className="text-sm">{room?.name || "Loading room..."}</span>
          <button
            className="btn-ghost btn-sm flex items-center gap-1"
            onClick={() => {
              navigator.clipboard.writeText(roomCode);
              addToast("Room code copied!");
            }}
          >
            <span className="text-secondary" style={{ fontSize: "0.75rem" }}>
              {roomCode}
            </span>{" "}
            <Copy size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ position: "relative", marginRight: "1rem" }}>
            <button
              onClick={() => setOnlineUsersOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                padding: "4px 6px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--success)",
                }}
              ></div>

              <span className="text-sm">{onlineUsers.length} Online</span>
            </button>

            {onlineUsersOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "38px",
                  right: "0",
                  width: "220px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px",
                  zIndex: 100,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "10px",
                    color: "var(--text-primary)",
                  }}
                >
                  Online Users
                </div>

                {onlineUsers.length === 0 ? (
                  <div className="text-sm text-secondary">No users online</div>
                ) : (
                  onlineUsers.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 0",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "var(--success)",
                        }}
                      ></div>

                      <span className="text-sm text-primary">
                        {user.id === currentUserId ? "You" : user.username}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <Button
            variant="primary"
            className="btn-sm"
            onClick={runCode}
            disabled={isRunning}
          >
            <Play size={14} /> {isRunning ? "Running..." : "Run Code"}
          </Button>
          <Button
            variant="danger"
            className="btn-sm"
            onClick={() => navigate("/dashboard")}
          >
            Leave
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="room-workspace" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Sidebar: File Explorer */}
        <aside
        className="room-explorer"
          style={{
            width: "240px",
            borderRight: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            display: sidebarOpen ? "flex" : "none",
            flexDirection: "column",
          }}
        >
          <div
            className="flex justify-between items-center"
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <span
              className="text-sm text-secondary"
              style={{ fontWeight: "600" }}
            >
              EXPLORER
            </span>

            <div className="flex items-center gap-1">
              <button
                className="btn-ghost btn-sm"
                onClick={handleCreateFile}
                title="New file"
              >
                <Plus size={16} />
              </button>

              <button
                className="btn-ghost btn-sm"
                onClick={() => setSidebarOpen(false)}
                title="Collapse Explorer"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 text-sm"
                style={{
                  padding: "6px 8px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  background:
                    activeFile?.id === file.id
                      ? "var(--primary-glow)"
                      : "transparent",
                  color:
                    activeFile?.id === file.id
                      ? "var(--primary)"
                      : "var(--text-secondary)",
                }}
                onClick={() => handleFileSelect(file)}
              >
                <FileCode size={16} />

                <span style={{ flex: 1 }}>{file.filename}</span>

                {/* Rename button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameFile(file);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Rename file"
                >
                  <Pencil size={14} />
                </button>
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Delete file"
                >
                  <Trash2 size={14} />
                </button>
                {activeFile?.id === file.id && (
                  <div
                    style={{
                      width: "2px",
                      height: "16px",
                      background: "var(--primary)",
                      borderRadius: "2px",
                    }}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Center: Editor & Terminal */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* Editor Toolbar */}
          <div
            className="room-editor-toolbar flex justify-between items-center"
            style={{
              padding: "0.5rem 1rem",
              borderBottom: "1px solid var(--border-color)",
              background: "var(--bg-tertiary)",
            }}
          >
            <div className="flex items-center gap-2">
              {!sidebarOpen && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => setSidebarOpen(true)}
                >
                  <ChevronRight size={16} />
                </button>
              )}
              <span className="text-sm">
                {activeFile?.filename || "No file selected"}
              </span>
              <span
                className="text-sm text-secondary"
                style={{ fontSize: "0.75rem" }}
              >
                • Saved
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="primary"
                className="btn-sm"
                onClick={() => handleSaveFile()}
                disabled={!activeFile}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                className="btn-sm"
                onClick={() => {
                  setHistoryOpen((prev) => !prev);
                  if (!historyOpen) {
                    loadHistory();
                  }
                }}
                disabled={!activeFile}
              >
                History
              </Button>
              <button className="btn-ghost btn-sm">
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language={activeFile?.language || "javascript"}
              theme="vs-dark"
              value={code}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: "on",
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 16 },
              }}
            />
          </div>

          {/* Bottom Terminal Panel */}
          {terminalOpen && (
            <div
              style={{
                height: "200px",
                borderTop: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="flex items-center gap-1"
                style={{ borderBottom: "1px solid var(--border-color)" }}
              >
                {["output", "console", "tests"].map((tab) => (
                  <button
                    key={tab}
                    className="btn-ghost btn-sm"
                    style={{
                      borderRadius: 0,
                      borderBottom:
                        terminalTab === tab
                          ? "2px solid var(--primary)"
                          : "none",
                      color:
                        terminalTab === tab
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      textTransform: "capitalize",
                    }}
                    onClick={() => setTerminalTab(tab)}
                  >
                    {tab === "output" && (
                      <TerminalIcon size={14} style={{ marginRight: "4px" }} />
                    )}
                    {tab}
                  </button>
                ))}
                <div style={{ flex: 1 }}></div>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => setTerminalOpen(false)}
                >
                  <ChevronLeft
                    size={16}
                    style={{ transform: "rotate(90deg)" }}
                  />
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "1rem",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  overflowY: "auto",
                }}
              >
                {terminalTab === "output" && !isRunning && (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      color: "var(--text-primary)",
                    }}
                  >
                    {executionOutput || (
                      <span className="text-secondary">
                        Ready to execute. Click "Run Code" to see output.
                      </span>
                    )}
                  </div>
                )}
                {terminalTab === "output" && isRunning && (
                  <div className="text-secondary">Compiling and running...</div>
                )}
                {terminalTab === "tests" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} color="var(--success)" /> Test Case
                      1: Passed (12ms)
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle size={16} color="var(--error)" /> Test Case
                      2: Failed (Expected: 5, Got: 4)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {!terminalOpen && (
            <button
              className="btn-ghost btn-sm"
              style={{
                borderTop: "1px solid var(--border-color)",
                borderRadius: 0,
              }}
              onClick={() => setTerminalOpen(true)}
            >
              <ChevronRight size={16} style={{ transform: "rotate(-90deg)" }} />{" "}
              Show Terminal
            </button>
          )}
        </main>
        {/* Reopen Chat Button */}
        {!chatOpen && (
          <button
            className="btn-ghost btn-sm"
            onClick={() => setChatOpen(true)}
            title="Open Room Chat"
            style={{
              width: "36px",
              borderLeft: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {/* History Sidebar */}
        {historyOpen && (
          <div
            style={{
              position: "absolute",
              top: "60px",
              right: "1rem",
              width: "300px",
              maxWidth:"calc(100vw - 2rem)",
              maxHeight: "400px",
              overflowY: "auto",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px",
              zIndex: 200,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <strong>Code History</strong>

              <button
                onClick={() => setHistoryOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-sm text-secondary">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-secondary">
                No saved versions yet.
              </div>
            ) : (
              history.map((version, index) => (
                <div
                  key={version.id}
                  style={{
                    padding: "10px",
                    marginBottom: "8px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <strong>Version {history.length - index}</strong>

                    <div className="text-sm text-secondary">
                      {version.username || "Unknown user"} ·{" "}
                      {new Date(version.created_at).toLocaleString()}
                    </div>
                  </div>

                  <pre
                    style={{
                      maxHeight: "100px",
                      overflow: "hidden",
                      fontSize: "12px",
                      whiteSpace: "pre-wrap",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {version.content}
                  </pre>
                  <button
                    onClick={() => {
                      setCode(version.content);
                      setHistoryOpen(false);
                      addToast("Version loaded into editor", "success");
                    }}
                    style={{
                      marginTop: "8px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      setCompareVersion(version);
                      setCompareOpen(true);
                    }}
                    style={{
                      marginTop: "8px",
                      marginLeft: "6px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Compare
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        {/* Right Sidebar: Chat & Members */}
        <aside
        className="room-chat"
          style={{
            width: "300px",
            borderLeft: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            display: chatOpen ? "flex" : "none",
            flexDirection: "column",
          }}
        >
          <div
            className="flex justify-between items-center"
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <span className="text-sm" style={{ fontWeight: "600" }}>
              Room Chat
            </span>
            <button
              className="btn-ghost btn-sm"
              onClick={() => setChatOpen(false)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {messages.map((msg) => {
              const isMine = msg.user === "You";

              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {isMine ? "You" : msg.user}
                  </div>

                  <div
                    className="text-sm"
                    style={{
                      background: isMine
                        ? "var(--accent-color)"
                        : "var(--bg-tertiary)",
                      color: isMine ? "#fff" : "var(--text-primary)",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      lineHeight: "1.5",
                      maxWidth: "85%",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.text}
                  </div>

                  <span
                    className="text-secondary"
                    style={{
                      fontSize: "0.65rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {msg.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={sendMessage}
            style={{
              padding: "1rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                className="input"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{ fontSize: "0.875rem" }}
              />
              <Button type="submit" variant="primary" className="btn-sm">
                Send
              </Button>
            </div>
          </form>
        </aside>
      </div>
      {compareOpen && compareVersion && (
        <div
        className="compare-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px",
          }}
        >
          <div
          className="compare-modal"
            style={{
              width: "90vw",
              height: "80vh",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <strong>Code Comparison</strong>

                <div className="text-sm text-secondary">
                  Version by {compareVersion.username || "Unknown user"}
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <button
                  onClick={() => {
                    setCode(compareVersion.content);
                    setCompareOpen(false);
                    setCompareVersion(null);

                    addToast("Version loaded into editor", "success");
                  }}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--accent)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  Restore this version
                </button>

                <button
                  onClick={() => {
                    setCompareOpen(false);
                    setCompareVersion(null);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "22px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0,minHeight: 0,width: "100%" ,}}>
              <DiffEditor
                height="100%"
                language={activeFile?.language || "javascript"}
                theme="vs-dark"
                original={compareVersion.content}
                modified={code}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  renderSideBySide: window.innerWidth > 768,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
