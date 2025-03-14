export const setupSocket = (io) => {
  io.on('connection', (socket) => {
  // Extract sessionToken from the query parameters during connection
  const { sessionToken } = socket.handshake.query;
    console.log(`A user connected: ${socket.id}`);
    
    if(sessionToken) {
      socket.on('join', (sessionToken) => {
      console.log(`User ${socket.id} joining room: ${sessionToken}`);
      socket.join(sessionToken); // Join a room based on the session token
    });
    }
  
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${reason}`);
    });
  });
};

/*
export const setupSocket = (io) => {
    io.on('connection', (socket) => {
      console.log(`A user connected: ${socket.id}`);
  
      socket.on('join', (sessionToken) => {
        console.log(`User ${socket.id} joining room: ${sessionToken}`);
        socket.join(sessionToken); // Join a room based on the session token
      });
  
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  };
*/