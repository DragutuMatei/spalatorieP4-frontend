import axios from "axios";
const AXIOS = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_LINK,
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true,
});

export default AXIOS;
