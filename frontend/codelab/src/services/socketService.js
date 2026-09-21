import { io } from "socket.io-client";

let socket = null;

export const socketService = {
  connect: (roomCode = null, onOnlineUsers) => {
    const token = localStorage.getItem("codelab_token");

    socket = io(import.meta.env.VITE_SOCKET_URL, {
        auth: {
            token
        }
    });

  socket.on("connect", () => {
  console.log("[Socket] Connected:", socket.id);

  if (roomCode) {
    socket.emit("join-room", roomCode);

    console.log(`[Socket] Joined room: ${roomCode}`);
  }
});

   const handleOnlineUsers = (users) => {
  if (onOnlineUsers) {
    onOnlineUsers(users);
  }
};
//active status of users
socket.on("online-users", handleOnlineUsers);
return () => {
  if (socket) {
    socket.off("online-users", handleOnlineUsers);
  }
};
},
createFile: (roomCode, file) => {
  if (!socket) return;
  socket.emit("file-created", { roomCode, file });
},
renameFile: (roomCode, file) => {
  if (!socket) return;
  socket.emit("file-renamed", { roomCode, file });
},
deleteFile: (roomCode, fileId) => {
  if (!socket) {
    console.log("[Socket] Cannot delete file: socket not connected");
    return;
  }

  console.log(
    "[Socket] Sending file-deleted:",
    roomCode,
    fileId
  );

  socket.emit("file-deleted", {
    roomCode,
    fileId
  });
},
onFileCreated: (callback) => {
  if (!socket) return;

  socket.on("file-created", callback);

  return () => {
    if(socket){
    socket.off("file-created", callback);
    }
  };
},
onFileRenamed: (callback) => {
  if (!socket) return;

  socket.on("file-renamed", callback);

  return () => {
    if(socket){
    socket.off("file-renamed", callback);
    }
  };
},

onFileDeleted: (callback) => {
  if (!socket) return;

  socket.on("file-deleted", callback);

  return () => {
    if(socket){
    socket.off("file-deleted", callback);
    }
  };
},
 onMessage: (callback) => {
    if (!socket) return;

    socket.on("message", callback);
     return () => {
    if (socket) {
      socket.off("message", callback);
    }
  };
  },
  
onRoomDeleted: (callback) => {
  if (!socket) return;

  socket.on("room-deleted", callback);

  return () => {
    if (socket) {
      socket.off("room-deleted", callback);
    }
  };
},
 disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    console.log("[Socket] Disconnected");
  },

 sendCodeUpdate: (roomCode, fileId, code) => {
  if (!socket) return;
   socket.emit("code-change", {
    roomCode,
    fileId,
    code
  });
},
onCodeChange: (callback) => {
    if (!socket) return;

    socket.on("code-change", callback);
    return () => {
    if (socket) {
      socket.off("code-change", callback);
    }
  };
  },

  sendMessage: (roomCode, message) => {
  if (!socket) return;

  socket.emit("message", {
    roomCode,
    message
  });
}

};