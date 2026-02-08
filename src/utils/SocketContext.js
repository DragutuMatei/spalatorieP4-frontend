// import { createContext, useContext } from 'react';
// import { io } from 'socket.io-client';

// const SocketContext = createContext(null);

// export const SocketProvider = ({ children }) => {
//   const socket = io(process.env.REACT_APP_BACKEND_LINK);

//   return (
//     <SocketContext.Provider value={socket}>
//       {children}
//     </SocketContext.Provider>
//   );
// };
import { createContext, useContext, useMemo } from "react";
import { io } from "socket.io-client";
import AXIOS from "./Axios_config";

const SocketContext = createContext(null);

const resolveBackendUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }

  if (process.env.REACT_APP_BACKEND_LINK) {
    return process.env.REACT_APP_BACKEND_LINK;
  }

  if (AXIOS?.defaults?.baseURL) {
    return AXIOS.defaults.baseURL;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return undefined;
};

export const SocketProvider = ({ children }) => {
  const backendUrl = useMemo(resolveBackendUrl, []);

  const socket = useMemo(() => {
    if (!backendUrl) {
      console.warn(
        "Socket backend URL not defined; falling back to current origin."
      );
      return io();
    }

    return io(backendUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }, [backendUrl]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);