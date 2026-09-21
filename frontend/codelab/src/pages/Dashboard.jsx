import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Button, Input, Modal } from "../components/common/UI";
import { socketService } from "../services/socketService";
import {
  Plus,
  Search,
  Users,
  Clock,
  Copy,
  ExternalLink,
  Trash2,
} from "lucide-react";

export const Dashboard = () => {
  const { user, addToast } = useApp();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch rooms when Dashboard loads
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("codelab_token");

        if (!token) {
          addToast("Please log in again", "error");
          return;
        }

        const response = await fetch(
           `${import.meta.env.VITE_API_URL}/api/rooms/my-rooms`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load rooms");
        }

        setRooms(data);
      } catch (error) {
        console.error(error);
        addToast(error.message, "error");
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [addToast]);
  // Connect to Socket.IO for dashboard events
  useEffect(() => {
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);
  // Listen for rooms deleted by their owner
  useEffect(() => {
    const cleanup = socketService.onRoomDeleted(({ roomCode }) => {
      setRooms((prevRooms) =>
        prevRooms.filter((room) => room.room_code !== roomCode),
      );

      addToast("A room you belong to was deleted.", "info");
    });

    return cleanup;
  }, [addToast]);
  // Create a room
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!roomName.trim()) {
      return addToast("Please enter a room name", "error");
    }

    try {
      setCreating(true);

      const token = localStorage.getItem("codelab_token");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roomName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create room");
      }

      addToast(`Room created! Code: ${data.room.room_code}`, "success");

      setRoomName("");
      setCreateModalOpen(false);

      // Add newly created room to the dashboard
      setRooms((prev) => [
        {
          ...data.room,
          role: "owner",
          owner: user.username,
        },
        ...prev,
      ]);
    } catch (error) {
      console.error(error);
      addToast(error.message, "error");
    } finally {
      setCreating(false);
    }
  };

  // Join a room
  const handleJoin = async (e) => {
    e.preventDefault();

    if (!roomCode.trim()) {
      return addToast("Please enter a room code", "error");
    }

    try {
      setJoining(true);

      const token = localStorage.getItem("codelab_token");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join room");
      }

      addToast("Joined room successfully!", "success");

      setRoomCode("");
      setJoinModalOpen(false);

      setRooms((prev) => [
        {
          ...data.room,
          role: "member",
          owner: "Room Owner",
        },
        ...prev,
      ]);
    } catch (error) {
      console.error(error);
      addToast(error.message, "error");
    } finally {
      setJoining(false);
    }
  };

  // Filter rooms using search
  const filteredRooms = rooms.filter((room) => {
    const search = searchTerm.toLowerCase();

    return (
      room.name.toLowerCase().includes(search) ||
      room.room_code.toLowerCase().includes(search)
    );
  });
  // delete a room
  const handleDeleteRoom = async (room) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${room.name}"? This will permanently delete the room and its files, messages, and history.`,
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("codelab_token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/rooms/${room.room_code}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete room");
      }

      setRooms((prevRooms) => prevRooms.filter((r) => r.id !== room.id));

      addToast("Room deleted successfully.");
    } catch (error) {
      console.error("Delete room error:", error);
      addToast(error.message || "Failed to delete room.", "error");
    }
  };
  return (
    <div className="container" style={{ padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div
        className="flex justify-between items-center"
        style={{ marginBottom: "2rem" }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
            }}
          >
            Welcome back, {user?.username || "Developer"}
          </h1>

          <p className="text-secondary">
            Manage your coding rooms and collaborations.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setJoinModalOpen(true)}>
            <ExternalLink size={16} />
            Join Room
          </Button>

          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} />
            Create Room
          </Button>
        </div>
      </div>

      {/* Search */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          padding: "1rem",
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={18}
            className="text-secondary"
            style={{
              position: "absolute",
              left: "12px",
              top: "12px",
            }}
          />

          <input
            className="input"
            placeholder="Search rooms by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "40px" }}
          />
        </div>
      </div>

      {/* Rooms */}
      <h3 style={{ marginBottom: "1rem" }}>Your Rooms</h3>

      {loadingRooms ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "3rem",
          }}
        >
          <p className="text-secondary">Loading rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "3rem",
          }}
        >
          <p className="text-secondary">
            {rooms.length === 0
              ? "No rooms yet. Create or join one to get started!"
              : "No rooms match your search."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredRooms.map((room) => (
            <div key={room.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <h4
                  style={{
                    fontSize: "1.1rem",
                  }}
                >
                  {room.name}
                </h4>

                <span
                  className="text-sm"
                  style={{
                    background: "var(--primary-glow)",
                    color: "var(--primary)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {room.room_code}
                </span>
              </div>

              <div className="flex flex-col gap-2 text-sm text-secondary mb-4">
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  Owner: {room.owner}
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  Role: {room.role}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => {
                    navigator.clipboard.writeText(room.room_code);
                    addToast("Code copied!");
                  }}
                >
                  <Copy size={14} />
                  Copy Code
                </Button>

                <Button
                  variant="primary"
                  className="btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => navigate(`/room/${room.room_code}`)}
                >
                  Open Room
                </Button>

                {room.role === "owner" && (
                  <Button
                    variant="danger"
                    className="btn-sm"
                    onClick={() => handleDeleteRoom(room)}
                    title="Delete Room"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Room"
      >
        <form className="flex flex-col gap-4" onSubmit={handleCreate}>
          <Input
            label="Room Name"
            placeholder="e.g., Interview Prep"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" disabled={creating}>
            {creating ? "Creating..." : "Create Room"}
          </Button>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Join Existing Room"
      >
        <form className="flex flex-col gap-4" onSubmit={handleJoin}>
          <Input
            label="Room Code"
            placeholder="e.g., ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" disabled={joining}>
            {joining ? "Joining..." : "Join Room"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
