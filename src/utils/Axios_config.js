import axios from "axios";
const AXIOS = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_LINK,
  // baseURL: "https://living-fayth-testing-osfiir-177f6c3b.koyeb.app",
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true,
});

export default AXIOS;
