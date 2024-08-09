"use client";

import { socket } from "../../socket";
import { useState, useEffect } from "react";
import { IMsgDataTypes } from "../../types/IMsgDataTypes";

const AdminPage = () => {
  const [roomId, setRoomId] = useState("");
  const [user, setUser] = useState("Tony Lo");
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<IMsgDataTypes[]>([]);
  const [msg, setMsg] = useState("");

  const getDate = () => {
    const dt = new Date();
    const padL = (nr: number, len = 2, chr = `0`) => `${nr}`.padStart(2, chr);
    const formatDate = `${padL(dt.getMonth() + 1)}/${padL(
      dt.getDate()
    )}/${dt.getFullYear()} ${padL(dt.getHours())}:${padL(
      dt.getMinutes()
    )}:${padL(dt.getSeconds())}`;
    return formatDate;
  };

  useEffect(() => {
    socket.on("receive_msg", (data: IMsgDataTypes) => {
      setMsgs((pre) => [...pre, data]);
    });

    socket.on("get_rooms", (roomIds: string[]) => {
      setRoomIds(roomIds);
    });

    socket.emit("get_rooms");
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-700  flex text-white">
      <div className="w-1/2 h-1/2 flex justify-center items-center  my-auto mx-auto">
        <div className="w-1/3 flex flex-col h-full border-white border overflow-y-auto">
          {roomIds.map((roomId) => (
            <div
              onClick={() => {
                setRoomId(roomId);
                setMsgs([]);

                if (roomId !== "SYSTEM BROADCAST")
                  socket.emit("join_room", {
                    roomId,
                    user: user,
                    roomName: roomId,
                  });

                socket.emit("get_rooms");
              }}
              className="cursor-pointer hover:bg-slate-400 p-2 truncate"
              key={roomId}
            >
              {roomId}
            </div>
          ))}
        </div>
        <div className="flex flex-1 h-full border-white border flex-col">
          <div className="font-semibold justify-center w-full flex p-2">
            Room Name: {roomId}
          </div>

          <div className="h-full flex flex-1 flex-col overflow-y-auto">
            {msgs.map((msg, index) => (
              <div
                key={`msg-${index}`}
                className="flex flex-row p-2 justify-between w-full"
              >
                <div>{msg.time}</div>
                <div>{msg.msg}</div>
              </div>
            ))}
          </div>

          <div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                if (msg != "") {
                  setMsg("");
                  const msgData: IMsgDataTypes = {
                    roomId,
                    user: user,
                    msg: msg,
                    time: getDate(),
                  };

                  await socket.emit(
                    roomId === "SYSTEM BROADCAST"
                      ? "broadcast_msg"
                      : "send_msg",
                    msgData
                  );
                }
              }}
              className="flex flex-1 flex-row"
            >
              <input
                className="text-black w-full p-2"
                type="text"
                value={msg}
                placeholder="Type your message.."
                onChange={(e) => setMsg(e.target.value)}
              />
              <button className="p-2 bg-slate-400">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
