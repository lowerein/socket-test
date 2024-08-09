import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : process.env.HOSTNAME;
const port = dev ? 3000 : process.env.PORT;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const getDate = () => {
  const dt = new Date();
  const padL = (nr, len = 2, chr = `0`) => `${nr}`.padStart(2, chr);
  const formatDate = `${padL(dt.getMonth() + 1)}/${padL(
    dt.getDate()
  )}/${dt.getFullYear()} ${padL(dt.getHours())}:${padL(dt.getMinutes())}:${padL(
    dt.getSeconds()
  )}`;
  return formatDate;
};

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);
  let userMap = new Map();
  io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("join_room", (data) => {
      socket.join(data.roomId);
      console.log(`user with id-${socket.id} joined room - ${data.roomId}`);
      userMap.set(socket.id, data.user);
      let clients = io.sockets.adapter.rooms.get(data.roomId);
      let usernames = [...new Set([...clients].map((id) => userMap.get(id)))];

      io.to(data.roomId).emit("receive_msg", {
        roomId: data.roomId,
        user: data.roomName,
        msg: `${data.user} has joined the room.`,
        time: getDate(),
      });

      io.to(data.roomId).emit("receive_msg", {
        roomId: data.roomId,
        user: data.roomName,
        msg: `Current users: ${usernames.join(", ")}`,
        time: getDate(),
      });
    });

    socket.on("leave_room", (data) => {
      socket.leave(data.roomId);
      console.log(`user with id-${socket.id} left room - ${data.roomId}`);
      let clients = io.sockets.adapter.rooms.get(data.roomId);

      if (clients?.size > 0) {
        io.to(data.roomId).emit("receive_msg", {
          roomId: data.roomId,
          user: data.roomName,
          msg: `${data.user} has left the room.`,
          time: getDate(),
        });

        let usernames = [...new Set([...clients].map((id) => userMap.get(id)))];
        io.to(data.roomId).emit("receive_msg", {
          roomId: data.roomId,
          user: data.roomName,
          msg: `Current users: ${usernames.join(", ")}`,
          time: getDate(),
        });
      }
    });

    socket.on("send_msg", (data) => {
      console.log(data, "DATA");
      io.to(data.roomId).emit("receive_msg", data);
    });

    socket.on("broadcast_msg", (data) => {
      console.log(data, "DATA");
      io.emit("receive_msg", data);
    });

    socket.on("get_rooms", () => {
      let rooms = [
        "SYSTEM BROADCAST",
        ...Array.from(io.of("/").adapter.rooms.keys()).sort((a, b) =>
          a > b ? 1 : -1
        ),
      ];
      io.emit("get_rooms", rooms);
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
      if (userMap.has(socket.id)) userMap.delete(socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
