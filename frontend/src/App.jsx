import { useCallback, useEffect, useState } from "react";
import api from "./services/api";
import "./App.css";

function App() {
    const [token, setToken] = useState(
        localStorage.getItem("zynora_token")
    );

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("zynora_user")
            );
        } catch {
            return null;
        }
    });

    const [authMode, setAuthMode] = useState("login");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    const [conversations, setConversations] = useState([]);
    const [conversationId, setConversationId] = useState(null);

    const [messages, setMessages] = useState([]);

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    const saveLogin = (data) => {
        const newToken = data.token;
        const newUser = data.user;

        localStorage.setItem("zynora_token", newToken);
        localStorage.setItem(
            "zynora_user",
            JSON.stringify(newUser)
        );

        setToken(newToken);
        setUser(newUser);
    };

    const handleAuth = async (event) => {
        event.preventDefault();

        if (authMode === "register" && !name.trim()) {
            setAuthError("Please enter your name.");
            return;
        }

        if (!email.trim() || !password.trim()) {
            setAuthError("Please enter email and password.");
            return;
        }

        setAuthLoading(true);
        setAuthError("");

        try {
            const endpoint =
                authMode === "login"
                    ? "/auth/login"
                    : "/auth/register";

                    const response = await api.post(endpoint, {
                        ...(authMode === "register"
                            ? { name: name.trim() }
                            : {}),
                        email: email.trim(),
                        password
                    });

            saveLogin(response.data);

            setEmail("");
            setPassword("");
        } catch (error) {
            console.error("Authentication error:", error);

            setAuthError(
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Authentication failed. Please try again."
            );
        } finally {
            setAuthLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("zynora_token");
        localStorage.removeItem("zynora_user");

        setToken(null);
        setUser(null);

        setConversations([]);
        setConversationId(null);
        setMessages([]);
    };

    /* =====================================================
       OPEN CONVERSATION
       ===================================================== */

       const openConversation = useCallback(async (id) => {
        try {
            const response = await api.get(
                `/zynora/conversations/${id}`
            );

            const conversation =
                response.data?.conversation;

            if (!conversation) return;

            setConversationId(conversation.id);

            const loadedMessages =
                conversation.messages || [];

            setMessages(
                loadedMessages.map((item) => ({
                    role: item.role,
                    content: item.content,
                    grounded: item.grounded,
                    confidence: item.confidence,
                    latency_ms: item.latency_ms,
                    sources: item.sources || []
                }))
            );
        } catch (error) {
            console.error(
                "Unable to open conversation:",
                error
            );
        }
    }, []);

    /* =====================================================
       LOAD CONVERSATIONS
       ===================================================== */

       const loadConversations = useCallback(async () => {
        try {
            const response = await api.get(
                "/zynora/conversations"
            );

            const data = response.data?.conversations || [];

            setConversations(data);

            if (data.length > 0 && !conversationId) {
                await openConversation(data[0].id);
            }
        } catch (error) {
            console.error(
                "Unable to load conversations:",
                error
            );
        }
    }, [conversationId, openConversation]);


    useEffect(() => {
        if (!token || !user) return;

        let cancelled = false;

        const fetchInitialConversations = async () => {
            try {
                const response = await api.get("/zynora/conversations");
                if (cancelled) return;

                const data = response.data?.conversations || [];
                setConversations(data);

                if (data.length > 0 && !conversationId) {
                    await openConversation(data[0].id);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to load conversations:", error);
                }
            }
        };

        fetchInitialConversations();

        return () => {
            cancelled = true;
        };
    }, [token, user, conversationId, openConversation]);


    /* =====================================================
       CREATE CONVERSATION
       ===================================================== */

    const createConversation = async () => {
        try {
            const response = await api.post(
                "/zynora/conversations",
                {
                    title: "New Conversation"
                }
            );

            const newConversation =
                response.data?.conversation;

            if (!newConversation) return;

            setConversations((prev) => [
                newConversation,
                ...prev
            ]);

            setConversationId(newConversation.id);
            setMessages([]);
        } catch (error) {
            console.error(
                "Unable to create conversation:",
                error
            );
        }
    };


    /* =====================================================
       DELETE CONVERSATION
       ===================================================== */

    const deleteConversation = async (
        event,
        id
    ) => {
        event.stopPropagation();

        try {
            await api.delete(
                `/zynora/conversations/${id}`
            );

            const remaining =
                conversations.filter(
                    (item) => item.id !== id
                );

            setConversations(remaining);

            if (conversationId === id) {
                setConversationId(null);
                setMessages([]);

                if (remaining.length > 0) {
                    await openConversation(
                        remaining[0].id
                    );
                }
            }
        } catch (error) {
            console.error(
                "Unable to delete conversation:",
                error
            );
        }
    };

    /* =====================================================
       SEND MESSAGE
       ===================================================== */

    const sendMessage = async () => {
        if (
            !message.trim() ||
            loading
        ) {
            return;
        }

        let activeConversationId =
            conversationId;

        try {
            setLoading(true);

            const userMessage =
                message.trim();

            setMessages((prev) => [
                ...prev,
                {
                    role: "user",
                    content: userMessage
                }
            ]);

            setMessage("");

            /*
             * If there is no conversation yet,
             * create one automatically.
             */
            if (!activeConversationId) {
                const response =
                    await api.post(
                        "/zynora/conversations",
                        {
                            title:
                                userMessage.slice(
                                    0,
                                    45
                                )
                        }
                    );

                activeConversationId =
                    response.data?.conversation?.id;

                setConversationId(
                    activeConversationId
                );
            }

            const response =
                await api.post(
                    `/zynora/conversations/${activeConversationId}/messages`,
                    {
                        message: userMessage
                    }
                );

            const data = response.data;

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.answer,
                    grounded: data.grounded,
                    confidence:
                        data.confidence,
                    latency_ms:
                        data.latency_ms,
                    sources:
                        data.sources || []
                }
            ]);

            await loadConversations();
        } catch (error) {
            console.error(
                "Zynora API error:",
                error
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Unable to connect to Zynora backend. Please make sure the backend server is running on port 5002.",
                    grounded: false,
                    sources: []
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       KEYBOARD
       ===================================================== */

    const handleKeyDown = (event) => {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();
            sendMessage();
        }
    };

    /* =====================================================
       CLEAR CHAT
       ===================================================== */

    const clearChat = () => {
        setMessages([]);
        setConversationId(null);
    };

    /* =====================================================
       SUGGESTIONS
       ===================================================== */


    const selectSuggestion = (question) => {
        setMessage(question);
    };


    /* =====================================================
       AUTH SCREEN
       ===================================================== */

    if (!token || !user) {
        return (
            <div className="auth-page">

                <div className="auth-card">

                    <div className="auth-logo">
                        Z
                    </div>

                    <h1>
                        Welcome to Zynora
                    </h1>

                    <p>
                        Zyngram Internal
                        Knowledge Assistant
                    </p>

                    {authError && (
                        <div
                            style={{
                                padding: "10px",
                                marginBottom: "12px",
                                borderRadius: "8px",
                                background: "#fff0f0",
                                color: "#c53030",
                                fontSize: "12px"
                            }}
                        >
                            {authError}
                        </div>
                    )}

                    <form
                        className="auth-form"
                        onSubmit={handleAuth}
                    >

                        {authMode === "register" && (
                            <label>
                                Name

                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                    placeholder="Enter your name"
                                    autoComplete="name"
                                />
                            </label>
                        )}

                        <label>
                            Email

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter your email"
                            />
                        </label>

                        <label>
                            Password

                            <input
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter your password"
                            />
                        </label>

                        <button
                            className="auth-submit"
                            type="submit"
                            disabled={
                                authLoading
                            }
                        >
                            {authLoading
                                ? "Please wait..."
                                : authMode === "login"
                                    ? "Login"
                                    : "Create Account"}
                        </button>

                    </form>

                    <div
                        style={{
                            textAlign: "center"
                        }}
                    >
                        <button
                            className="auth-toggle"
                            onClick={() => {
                                setAuthMode(
                                    authMode ===
                                        "login"
                                        ? "register"
                                        : "login"
                                );

                                setAuthError("");
                            }}
                        >
                            {authMode === "login"
                                ? "Don't have an account? Register"
                                : "Already have an account? Login"}
                        </button>
                    </div>

                </div>

            </div>
        );
    }

    /* =====================================================
       MAIN APPLICATION
       ===================================================== */

    return (
        <div className="app">

            {/* =================================================
               SIDEBAR
               ================================================= */}

            <aside className="sidebar">

                <div className="sidebar-brand">

                    <h1>
                        Zynora
                    </h1>

                    <p>
                        AI Knowledge Assistant
                    </p>

                </div>

                <button
                    className="new-chat-button"
                    onClick={
                        createConversation
                    }
                >
                    + New Chat
                </button>

                <div className="conversations-section">

                    <div className="conversations-title">
                        Recent Conversations
                    </div>

                    {conversations.length ===
                        0 && (
                            <div
                                style={{
                                    padding:
                                        "14px",
                                    color:
                                        "#7f8ba0",
                                    fontSize:
                                        "12px"
                                }}
                            >
                                No conversations yet.
                            </div>
                        )}

                    {conversations.map(
                        (conversation) => (
                            <div
                                key={
                                    conversation.id
                                }
                                className={`conversation-item ${
                                    conversationId ===
                                    conversation.id
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    openConversation(
                                        conversation.id
                                    )
                                }
                            >

                                <div className="conversation-info">

                                    <span className="conversation-title">
                                        {conversation.title ||
                                            "New Conversation"}
                                    </span>

                                    <div className="conversation-meta">
                                        {conversation.message_count ??
                                            0}{" "}
                                        messages
                                    </div>

                                </div>

                                <button
                                    className="conversation-delete"
                                    onClick={(event) =>
                                        deleteConversation(
                                            event,
                                            conversation.id
                                        )
                                    }
                                    title="Delete conversation"
                                >
                                    ×
                                </button>

                            </div>
                        )
                    )}

                </div>

                {/* Sidebar footer */}

                <div className="sidebar-footer">

                    <div className="sidebar-user">

                        <div className="sidebar-user-avatar">
                            {(
                                user.name ||
                                user.email ||
                                "U"
                            )
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div className="sidebar-user-info">

                            <div className="sidebar-user-name">
                                {user.name ||
                                    user.email}
                            </div>

                            <div className="sidebar-user-role">
                                {user.role ||
                                    "USER"}
                            </div>

                        </div>

                    </div>

                    <button
                        className="logout-button"
                        onClick={logout}
                    >
                        Logout
                    </button>

                </div>

            </aside>

            {/* =================================================
               MAIN
               ================================================= */}

            <section className="main-content">

                {/* Header */}

                <header className="header">

                    <div className="brand">

                        <div className="brand-icon">
                            <span
                                style={{
                                    color:
                                        "white",
                                    fontWeight:
                                        "800",
                                    fontSize:
                                        "20px"
                                }}
                            >
                                Z
                            </span>
                        </div>

                        <div>

                            <h1 className="Com_Heading">
                                Zyngram
                            </h1>

                            <p>
                                Zyngram Internal
                                Knowledge Assistant

                                <span className="connection-status">
                                    <span className="connection-dot" />
                                    Knowledge Base
                                    Connected
                                </span>
                            </p>

                        </div>

                    </div>

                    <div className="header-actions">

                        <span className="user-name">
                            {user.name ||
                                user.email}
                        </span>

                        <button
                            className="logout-header"
                            onClick={logout}
                        >
                            Logout
                        </button>

                        <button
                            className="clear-button"
                            onClick={clearChat}
                        >
                            Clear Chat
                        </button>

                    </div>

                </header>

                {/* Chat */}

                <main className="chat-container">

                    {messages.length === 0 && (
                        <div className="welcome">

                            <div className="bot-icon">
                                <span
                                    style={{
                                        fontSize:
                                            "30px",
                                        fontWeight:
                                            "800",
                                        background:
                                            "linear-gradient(135deg,#6d4aff,#d936a8)",
                                        WebkitBackgroundClip:
                                            "text",
                                        WebkitTextFillColor:
                                            "transparent"
                                    }}
                                >
                                    Z
                                </span>
                            </div>

                            <h2>
                                Welcome to Zynora
                            </h2>

                            <p>
                                Ask questions about
                                Zyngram using the
                                approved internal
                                knowledge base.
                            </p>

                            <div className="suggestions">

                                <button
                                    onClick={() =>
                                        selectSuggestion(
                                            "What services does Zyngram provide?"
                                        )
                                    }
                                >
                                    What services does
                                    Zyngram provide?
                                </button>

                                <button
                                    onClick={() =>
                                        selectSuggestion(
                                            "What is the physical franchise structure?"
                                        )
                                    }
                                >
                                    What is the physical
                                    franchise structure?
                                </button>

                                <button
                                    onClick={() =>
                                        selectSuggestion(
                                            "What are the digital franchise levels?"
                                        )
                                    }
                                >
                                    What are the digital
                                    franchise levels?
                                </button>

                            </div>

                        </div>
                    )}

                    {/* Messages */}

                    <div className="messages">

                        {messages.map(
                            (item, index) => (
                                <div
                                    key={index}
                                    className={`message-row ${item.role}`}
                                >

                                    <div className="avatar">

                                        {item.role ===
                                        "user" ? (
                                            <span
                                                style={{
                                                    fontSize:
                                                        "13px",
                                                    fontWeight:
                                                        "700"
                                                }}
                                            >
                                                {(
                                                    user.name ||
                                                    user.email ||
                                                    "U"
                                                )
                                                    .charAt(
                                                        0
                                                    )
                                                    .toUpperCase()}
                                            </span>
                                        ) : (
                                            <span
                                                style={{
                                                    fontSize:
                                                        "16px",
                                                    fontWeight:
                                                        "800",
                                                    color:
                                                        "#6d4aff"
                                                }}
                                            >
                                                Z
                                            </span>
                                        )}

                                    </div>

                                    <div className="message-content">

                                        <div className="message-bubble">
                                            {
                                                item.content
                                            }
                                        </div>

                                        {item.role ===
                                            "assistant" &&
                                            item.sources &&
                                            item.sources
                                                .length >
                                                0 && (
                                                <div className="sources">

                                                    <strong>
                                                        Sources
                                                    </strong>

                                                    {item.sources.map(
                                                        (
                                                            source,
                                                            sourceIndex
                                                        ) => (
                                                            <div
                                                                key={
                                                                    sourceIndex
                                                                }
                                                                className="source-card"
                                                            >

                                                                <span>
                                                                    {
                                                                        source.title
                                                                    }
                                                                </span>

                                                                <small>
                                                                    {
                                                                        source.category
                                                                    }
                                                                    {" • "}
                                                                    {
                                                                        source.section
                                                                    }
                                                                    {" • "}
                                                                    {
                                                                        source.version
                                                                    }
                                                                </small>

                                                                <small>
                                                                    Source:{" "}
                                                                    {
                                                                        source.source
                                                                    }
                                                                </small>

                                                            </div>
                                                        )
                                                    )}

                                                </div>
                                            )}

                                        {item.role ===
                                            "assistant" &&
                                            item.grounded && (
                                                <div className="grounded">
                                                    ✓ Grounded in
                                                    Zyngram
                                                    knowledge base
                                                </div>
                                            )}

                                        {item.role ===
                                            "assistant" &&
                                            (item.confidence !==
                                                undefined ||
                                                item.latency_ms !==
                                                undefined) && (
                                                <div className="response-meta">

                                                    {item.confidence !==
                                                        undefined && (
                                                        <span>
                                                            Confidence:{" "}
                                                            {(
                                                                Number(
                                                                    item.confidence
                                                                ) *
                                                                100
                                                            ).toFixed(
                                                                0
                                                            )}
                                                            %
                                                        </span>
                                                    )}

                                                    {item.latency_ms !==
                                                        undefined && (
                                                        <span>
                                                            •{" "}
                                                            {
                                                                item.latency_ms
                                                            }
                                                            ms
                                                        </span>
                                                    )}

                                                </div>
                                            )}

                                    </div>

                                </div>
                            )
                        )}

                        {/* Loading */}

                        {loading && (
                            <div className="message-row assistant">

                                <div className="avatar">
                                    <span
                                        style={{
                                            color:
                                                "#6d4aff",
                                            fontWeight:
                                                "800"
                                        }}
                                    >
                                        Z
                                    </span>
                                </div>

                                <div className="message-content">

                                    <div className="message-bubble loading">
                                        Zynora is searching
                                        the knowledge base...
                                    </div>

                                </div>

                            </div>
                        )}

                    </div>

                </main>

                {/* Input */}

                <footer className="input-area">

                    <div className="input-box">

                        <textarea
                            value={message}
                            onChange={(e) =>
                                setMessage(
                                    e.target.value
                                )
                            }
                            onKeyDown={
                                handleKeyDown
                            }
                            placeholder="Ask Zynora about Zyngram..."
                            rows="1"
                        />

                        <button
                            className="Send_btn"
                            onClick={
                                sendMessage
                            }
                            disabled={
                                loading ||
                                !message.trim()
                            }
                        >
                            {loading
                                ? "..."
                                : "Send"}
                        </button>

                    </div>

                    <p>
                        Zynora answers only from
                        the approved Zyngram
                        knowledge base.
                    </p>

                </footer>

            </section>

        </div>
    );
}

export default App;