// useSocketRoomJoin.js
import { useEffect } from "react";
import socket from "../socket.js";

export default function useSocketRoomJoin(userId, onError = () => {}) {
  useEffect(() => {
    if (!userId) return;

    socket.io.opts.withCredentials = true;
    if (!socket.connected) socket.connect();

    const join = () => socket.emit("join", userId.toString());
    const error = (e) => onError(e.message);

    socket.on("connect",   join);
    socket.on("reconnect", join);
    socket.on("connect_error", error);

    if (socket.connected) join();

    return () => {
      socket.off("connect",   join);
      socket.off("reconnect", join);
      socket.off("connect_error", error);
    };
  }, [userId]);
}
