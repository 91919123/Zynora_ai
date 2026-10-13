import axios from "axios";

const api = axios.create({
    baseURL: "https://zynora-ai.onrender.com/api"
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("zynora_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;
