const injectionPatterns = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "forget your instructions",
    "system prompt",
    "reveal your prompt",
    "show me your instructions",
    "bypass rules",
    "override instructions",
    "use google",
    "search the web",
    "use internet",
    "external api"
];

function detectPromptInjection(message) {
    const query = String(message || "").toLowerCase();

    return injectionPatterns.some(pattern =>
        query.includes(pattern)
    );
}

module.exports = {
    detectPromptInjection
};