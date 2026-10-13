const db = require("../db");

// ============================================================
// CONSTANTS
// ============================================================

const NO_ANSWER =
    "I couldn't find this information in the approved Zyngram knowledge base.";

const DEFAULT_TOP_K = 3;

// ============================================================
// NORMALIZATION
// ============================================================

function normalize(text = "") {
    return String(text)
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(text = "") {
    return normalize(text)
        .split(" ")
        .filter(Boolean);
}

// ============================================================
// STOP WORDS
// ============================================================

const stopWords = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "what",
    "who",
    "where",
    "when",
    "why",
    "how",
    "does",
    "do",
    "did",
    "can",
    "could",
    "would",
    "should",
    "will",
    "about",
    "tell",
    "me",
    "please",
    "explain",
    "give",
    "information",
    "of",
    "for",
    "to",
    "in",
    "on",
    "and",
    "or",
    "with",
    "from",
    "by",
    "be",
    "it",
    "this",
    "that",
    "as",
    "an",
    "are",
    "there",
    "their",
    "its",
    "your",
    "you",
    "does"
]);

// ============================================================
// EXTERNAL / CLEARLY UNRELATED TOPICS 
// ============================================================

const externalTopics = [
    "weather forecast",
    "temperature today",
    "cricket score",
    "football score",
    "movie review",
    "actor biography",
    "actress biography",
    "political election",
    "politician",
    "stock market",
    "share price",
    "bitcoin price",
    "cryptocurrency price",
    "recipe for",
    "flight status",
    "train status",
    "railway schedule",
    "breaking news",
    "employee salary",
    "employee salaries",
    "salary structure",
    "employee compensation",
    "employee payroll",
    "payroll",
    "salary",
    "employee benefits",
    "employee wages",
    "human resources",
    "hr policy",
    "employee policy"
];

// ============================================================
// ZYNGRAM KEYWORDS
// ============================================================

const zyngramKeywords = [
    "zyngram",
    "zynora",
    "franchise",
    "franchisee",
    "franchising",

    // Physical
    "point",
    "center",
    "centre",
    "hub",
    "command",

    // Digital
    "digital node",
    "zone",
    "territory",
    "region",
    "nation",

    // Company concepts
    "vision",
    "mission",
    "values",
    "value",
    "ecosystem",
    "foundation",

    // Business
    "registration",
    "register",
    "subscription",
    "ownership",
    "owner",
    "customer",
    "partner",
    "onboarding",
    "business",

    // Services
    "service",
    "services",
    "category",
    "categories",

    // Commercial / opportunity
    "income",
    "earning",
    "earnings",
    "bonus",
    "bonuses",
    "reward",
    "rewards",
    "royalty",
    "referral",
    "affiliate",
    "achievement",
    "opportunity",

    // Doubts
    "doubt",
    "doubts",
    "scam",
    "guarantee",
    "guaranteed",
    "risk"
];

// ============================================================
// CHECK WHETHER QUESTION IS ZYNGRAM RELATED
// ============================================================

function isZyngramRelated(question = "") {
    const q = normalize(question);

    if (!q) {
        return false;
    }

    // Reject clearly unrelated questions.
    if (
        externalTopics.some((topic) =>
            q.includes(normalize(topic))
        )
    ) {
        return false;
    }

    // Explicit Zyngram terms.
    if (
        zyngramKeywords.some((term) =>
            q.includes(normalize(term))
        )
    ) {
        return true;
    }

    // Contextual questions that may omit "Zyngram".
    const contextualTerms = [
        "what comes after",
        "what comes before",
        "next level",
        "previous level",
        "level after",
        "level before",
        "physical structure",
        "digital structure",
        "franchise structure",
        "franchise hierarchy",
        "common doubts",
        "income guaranteed",
        "income guarantee",
        "is income guaranteed"
    ];

    if (
        contextualTerms.some((term) =>
            q.includes(term)
        )
    ) {
        return true;
    }

    return false;
}

// ============================================================
// ENTITY DETECTION
// ============================================================

function detectEntity(question = "") {
    const q = normalize(question);

    // --------------------------------------------------------
    // PHYSICAL LEVELS
    // --------------------------------------------------------

    if (
        q.includes("zyngram point") ||
        q.includes("franchise point") ||
        q.includes("point level") ||
        q === "point" ||
        q.includes("after point") ||
        q.includes("before point") ||
        q.includes("next level after point")
    ) {
        return "franchise_point";
    }

    if (
        q.includes("zyngram center") ||
        q.includes("zyngram centre") ||
        q.includes("franchise center") ||
        q.includes("franchise centre") ||
        q.includes("center level") ||
        q.includes("centre level") ||
        q === "center" ||
        q === "centre" ||
        q.includes("after center") ||
        q.includes("after centre") ||
        q.includes("before center") ||
        q.includes("before centre")
    ) {
        return "franchise_center";
    }

    if (
        q.includes("zyngram hub") ||
        q.includes("franchise hub") ||
        q.includes("hub level") ||
        q === "hub" ||
        q.includes("after hub") ||
        q.includes("before hub")
    ) {
        return "franchise_hub";
    }

    if (
        q.includes("zyngram command") ||
        q.includes("franchise command") ||
        q.includes("command level") ||
        q === "command" ||
        q.includes("after command") ||
        q.includes("before command")
    ) {
        return "franchise_command";
    }

    // --------------------------------------------------------
    // DIGITAL LEVELS
    // --------------------------------------------------------

    if (
        q.includes("zyngram digital node") ||
        q.includes("digital node")
    ) {
        return "digital_node";
    }

    if (
        q.includes("zyngram zone") ||
        q.includes("digital zone") ||
        q.includes("zone level") ||
        q === "zone"
    ) {
        return "franchise_zone";
    }

    if (
        q.includes("zyngram territory") ||
        q.includes("digital territory") ||
        q.includes("territory level") ||
        q === "territory"
    ) {
        return "franchise_territory";
    }

    if (
        q.includes("zyngram region") ||
        q.includes("digital region") ||
        q.includes("region level") ||
        q === "region"
    ) {
        return "franchise_region";
    }

    if (
        q.includes("zyngram nation") ||
        q.includes("digital nation") ||
        q.includes("nation level") ||
        q === "nation"
    ) {
        return "franchise_nation";
    }

    // --------------------------------------------------------
    // COMPANY INFORMATION
    // --------------------------------------------------------

    if (q.includes("vision")) {
        return "vision";
    }

    if (q.includes("mission")) {
        return "mission";
    }

    if (
        q.includes("core value") ||
        q.includes("core values") ||
        q.includes("values")
    ) {
        return "values";
    }

    // --------------------------------------------------------
    // SERVICES
    // --------------------------------------------------------

    if (
        q.includes("service categor") ||
        q.includes("service category") ||
        q.includes("services")
    ) {
        return "services";
    }

    // --------------------------------------------------------
    // BENEFITS
    // --------------------------------------------------------

    if (
        q.includes("benefit") ||
        q.includes("advantages")
    ) {
        return "benefits";
    }

    // --------------------------------------------------------
    // ECOSYSTEM
    // --------------------------------------------------------

    if (
        q.includes("ecosystem") ||
        q.includes("platform structure")
    ) {
        return "ecosystem";
    }

    // --------------------------------------------------------
    // FOUNDATION
    // --------------------------------------------------------

    if (q.includes("foundation")) {
        return "foundation";
    }

    // --------------------------------------------------------
    // COMMON DOUBTS
    // --------------------------------------------------------

    if (
        q.includes("common doubt") ||
        q.includes("common doubts") ||
        q.includes("doubts about") ||
        q.includes("doubt about") ||
        q.includes("is it a scam") ||
        q.includes("scam") ||
        q.includes("risk") ||
        q.includes("previous experience") ||
        q.includes("time required")
    ) {
        return "doubts";
    }

    // --------------------------------------------------------
    // INCOME GUARANTEE
    // --------------------------------------------------------

    if (
        q.includes("income guarantee") ||
        q.includes("income guaranteed") ||
        q.includes("guaranteed income") ||
        q.includes("guarantee income") ||
        q.includes("is income guaranteed") ||
        q.includes("profit guaranteed") ||
        q.includes("guaranteed profit") ||
        q.includes("returns guaranteed") ||
        q.includes("guaranteed returns")
    ) {
        return "income_guarantee";
    }

    // --------------------------------------------------------
    // ADDITIONAL OPPORTUNITIES
    // --------------------------------------------------------

    if (
        q.includes("additional franchise opportunity") ||
        q.includes("additional opportunity") ||
        q.includes("opportunity systems") ||
        q.includes("referral model") ||
        q.includes("bonus pool") ||
        q.includes("bonus pools") ||
        q.includes("royalty reward") ||
        q.includes("achievement system")
    ) {
        return "additional_opportunities";
    }

    // --------------------------------------------------------
    // ACCOUNT
    // --------------------------------------------------------

    if (
        q.includes("registration") ||
        q.includes("register") ||
        q.includes("create account") ||
        q.includes("account creation")
    ) {
        return "registration";
    }

    // --------------------------------------------------------
    // SUBSCRIPTION
    // --------------------------------------------------------

    if (
        q.includes("subscription") ||
        q.includes("subscription plan") ||
        q.includes("subscription plans")
    ) {
        return "subscription";
    }

    return null;
}

// ============================================================
// INTENT DETECTION
// ============================================================

function detectIntent(question = "") {
    const q = normalize(question);

    const entity = detectEntity(q);

    if (entity) {
        return entity;
    }

    // Count questions
    if (
        q.includes("how many") ||
        q.includes("number of") ||
        q.includes("count")
    ) {
        return "count";
    }

    // Physical franchise
    if (
        q.includes("physical franchise") ||
        (
            q.includes("physical") &&
            (
                q.includes("structure") ||
                q.includes("level") ||
                q.includes("hierarchy")
            )
        )
    ) {
        return "physical_franchise";
    }

    // Digital franchise
    if (
        q.includes("digital franchise") ||
        (
            q.includes("digital") &&
            (
                q.includes("structure") ||
                q.includes("level") ||
                q.includes("hierarchy")
            )
        )
    ) {
        return "digital_franchise";
    }

    // General franchise structure
    if (
        q.includes("franchise structure") ||
        q.includes("franchise hierarchy") ||
        q.includes("levels of franchise")
    ) {
        return "franchise_structure";
    }

    // Broad overview
    if (
        q.startsWith("what is") ||
        q.startsWith("what does") ||
        q.startsWith("tell me about") ||
        q.startsWith("about") ||
        q.startsWith("explain") ||
        q.includes("overview") ||
        q.includes("meaning") ||
        q.includes("introduction") ||
        q.includes("who is")
    ) {
        return "overview";
    }

    return "general";
}

// ============================================================
// INTENT TERMS
// ============================================================

function getIntentTerms(intent) {
    const map = {

        franchise_point: [
            "point",
            "zyngram point",
            "franchise point"
        ],

        franchise_center: [
            "center",
            "centre",
            "zyngram center",
            "zyngram centre"
        ],

        franchise_hub: [
            "hub",
            "zyngram hub"
        ],

        franchise_command: [
            "command",
            "zyngram command"
        ],

        digital_node: [
            "digital node",
            "zyngram digital node"
        ],

        franchise_zone: [
            "zone",
            "digital zone"
        ],

        franchise_territory: [
            "territory",
            "digital territory"
        ],

        franchise_region: [
            "region",
            "digital region"
        ],

        franchise_nation: [
            "nation",
            "digital nation"
        ],

        vision: [
            "vision"
        ],

        mission: [
            "mission"
        ],

        values: [
            "value",
            "values",
            "core values"
        ],

        services: [
            "service",
            "services",
            "category",
            "categories"
        ],

        benefits: [
            "benefit",
            "benefits",
            "advantages"
        ],

        ecosystem: [
            "ecosystem",
            "platform structure"
        ],

        foundation: [
            "foundation"
        ],

        doubts: [
            "doubt",
            "doubts",
            "scam",
            "risk",
            "time required",
            "previous experience"
        ],

        income_guarantee: [
            "income",
            "income guarantee",
            "income guaranteed",
            "guaranteed income",
            "profit",
            "returns"
        ],

        additional_opportunities: [
            "additional franchise opportunity",
            "additional opportunity",
            "opportunity systems",
            "referral model",
            "bonus pool",
            "royalty",
            "achievement"
        ],

        registration: [
            "registration",
            "register",
            "account creation"
        ],

        subscription: [
            "subscription",
            "subscription plan",
            "subscription plans"
        ],

        physical_franchise: [
            "physical",
            "franchise",
            "point",
            "center",
            "centre",
            "hub",
            "command"
        ],

        digital_franchise: [
            "digital",
            "franchise",
            "zone",
            "territory",
            "region",
            "nation"
        ],

        franchise_structure: [
            "franchise",
            "structure",
            "hierarchy",
            "levels"
        ],

        count: [
            "how many",
            "number",
            "count"
        ]
    };

    return map[intent] || [];
}

// ============================================================
// SPECIAL KNOWLEDGE GROUPS
// ============================================================

const specialGroups = {

    physical_franchise: {
        titles: [
            "physical franchise structure"
        ],
        keywords: [
            "point",
            "center",
            "centre",
            "hub",
            "command",
            "physical franchise",
            "physical structure"
        ]
    },

    digital_franchise: {
        titles: [
            "digital franchise structure"
        ],
        keywords: [
            "digital node",
            "zone",
            "territory",
            "region",
            "nation",
            "digital franchise",
            "digital structure"
        ]
    },

    doubts: {
        titles: [
            "source based doubt handling not formal faq"
        ],
        keywords: [
            "doubt",
            "doubts",
            "scam",
            "income",
            "guaranteed",
            "guarantee",
            "risk",
            "time required",
            "previous experience",
            "not guaranteed",
            "no income guarantee"
        ]
    },

    income_guarantee: {
        titles: [
            "source based doubt handling not formal faq"
        ],
        keywords: [
            "income",
            "guaranteed",
            "guarantee",
            "profit",
            "returns",
            "not guaranteed",
            "income is not guaranteed",
            "does not guarantee income"
        ]
    },

    additional_opportunities: {
        titles: [
            "additional franchise opportunity systems"
        ],
        keywords: [
            "additional",
            "opportunity",
            "opportunities",
            "referral",
            "affiliate",
            "income",
            "bonus",
            "bonuses",
            "working bonus",
            "super working bonus",
            "welcome bonus",
            "royalty",
            "reward",
            "achievement",
            "life achievement"
        ]
    }
};

// ============================================================
// TEXT HELPERS
// ============================================================

function phraseExists(text, phrase) {
    return normalize(text).includes(normalize(phrase));
}

function countMatchingTerms(text, terms) {
    const normalized = normalize(text);

    let count = 0;

    for (const term of terms) {
        if (normalized.includes(normalize(term))) {
            count++;
        }
    }

    return count;
}

// ============================================================
// SCORE CALCULATION
// ============================================================

function calculateScore(chunk, query, intent) {

    const q = normalize(query);

    const queryTokens = tokenize(q).filter(
        word => !stopWords.has(word)
    );

    const title = normalize(chunk.title || "");
    const category = normalize(chunk.category || "");
    const section = normalize(chunk.section || "");
    const content = normalize(chunk.content || "");

    let score = 0;

    // ========================================================
    // 1. EXACT TITLE MATCH
    // ========================================================

    if (title === q) {
        score += 1000;
    }

    // ========================================================
    // 2. EXACT / NEAR TITLE MATCH
    // ========================================================

    const entity = detectEntity(q);

    if (entity) {

        const terms = getIntentTerms(entity);

        for (const term of terms) {

            const normalizedTerm = normalize(term);

            if (title === normalizedTerm) {
                score += 500;
            }

            else if (title.includes(normalizedTerm)) {
                score += 180;
            }

            if (section.includes(normalizedTerm)) {
                score += 40;
            }

            if (content.includes(normalizedTerm)) {
                score += 8;
            }
        }
    }

    // ========================================================
    // 3. QUERY TOKEN MATCHING
    // ========================================================

    let titleMatches = 0;
    let contentMatches = 0;

    for (const word of queryTokens) {

        if (title.includes(word)) {
            score += 30;
            titleMatches++;
        }

        if (section.includes(word)) {
            score += 10;
        }

        if (category.includes(word)) {
            score += 5;
        }

        if (content.includes(word)) {
            score += 3;
            contentMatches++;
        }
    }

    // ========================================================
    // 4. PHRASE MATCH
    // ========================================================

    const importantPhrases = [
        "physical franchise",
        "digital franchise",
        "franchise structure",
        "franchise hierarchy",
        "common doubts",
        "income guaranteed",
        "income guarantee",
        "additional franchise opportunity",
        "opportunity systems",
        "source based doubt handling"
    ];

    for (const phrase of importantPhrases) {

        if (q.includes(phrase)) {

            if (title.includes(phrase)) {
                score += 250;
            }

            if (section.includes(phrase)) {
                score += 80;
            }

            if (content.includes(phrase)) {
                score += 40;
            }
        }
    }

    // ========================================================
    // 5. INTENT-SPECIFIC SCORING
    // ========================================================

    const intentTerms = getIntentTerms(intent);

    for (const term of intentTerms) {

        const normalizedTerm = normalize(term);

        if (title.includes(normalizedTerm)) {
            score += 50;
        }

        if (section.includes(normalizedTerm)) {
            score += 15;
        }

        if (content.includes(normalizedTerm)) {
            score += 5;
        }
    }

    // ========================================================
    // 6. SPECIAL KNOWLEDGE GROUP SCORING
    // ========================================================

    if (specialGroups[intent]) {

        const group = specialGroups[intent];

        // Exact title is extremely strong.
        for (const titleTerm of group.titles) {

            if (title === normalize(titleTerm)) {
                score += 700;
            }
        }

        // Title keyword matches.
        for (const keyword of group.keywords) {

            const term = normalize(keyword);

            if (title.includes(term)) {
                score += 120;
            }

            if (section.includes(term)) {
                score += 30;
            }

            if (content.includes(term)) {
                score += 8;
            }
        }
    }

    // ========================================================
    // 7. PHYSICAL HIERARCHY
    // ========================================================

    if (
        intent === "physical_franchise" ||
        intent === "franchise_structure" ||
        [
            "franchise_point",
            "franchise_center",
            "franchise_hub",
            "franchise_command"
        ].includes(intent)
    ) {

        const hasPoint = content.includes("point");
        const hasCenter =
            content.includes("center") ||
            content.includes("centre");
        const hasHub = content.includes("hub");
        const hasCommand = content.includes("command");

        if (
            hasPoint &&
            hasCenter &&
            hasHub &&
            hasCommand
        ) {
            score += 400;
        }

        if (
            title.includes("physical franchise structure")
        ) {
            score += 500;
        }
    }

    // ========================================================
    // 8. DIGITAL HIERARCHY
    // ========================================================

    if (
        intent === "digital_franchise" ||
        [
            "franchise_zone",
            "franchise_territory",
            "franchise_region",
            "franchise_nation"
        ].includes(intent)
    ) {

        const hasZone = content.includes("zone");
        const hasTerritory = content.includes("territory");
        const hasRegion = content.includes("region");
        const hasNation = content.includes("nation");

        if (
            hasZone &&
            hasTerritory &&
            hasRegion &&
            hasNation
        ) {
            score += 400;
        }

        if (
            title.includes("digital franchise structure")
        ) {
            score += 500;
        }
    }

    // ========================================================
    // 9. ZYNGRAM TITLE BONUS
    // ========================================================

    if (q.includes("zyngram")) {

        if (title.includes("zyngram")) {
            score += 80;
        }

        if (content.includes("zyngram")) {
            score += 5;
        }
    }

    // ========================================================
    // 10. AVOID GENERIC TITLE DOMINATION
    // ========================================================
    //
    // Generic overview/ecosystem chunks should not win a highly
    // specific question merely because they contain "Zyngram".
    //

    const genericTitles = [
        "zyngram overview",
        "zyngram ecosystem and platform structure"
    ];

    if (
        genericTitles.includes(title) &&
        intent !== "overview" &&
        intent !== "ecosystem" &&
        intent !== "general"
    ) {
        score -= 150;
    }

    // ========================================================
    // 11. SCORE QUALITY BONUS
    // ========================================================

    if (titleMatches >= 2) {
        score += 50;
    }

    if (contentMatches >= 3) {
        score += 30;
    }

    return score;
}

// ============================================================
// MINIMUM RELEVANCE
// ============================================================

function getMinimumScore(intent, query) {

    const q = normalize(query);

    // Exact/specific entity questions need strong matching.
    const specificIntents = [
        "franchise_point",
        "franchise_center",
        "franchise_hub",
        "franchise_command",
        "digital_node",
        "franchise_zone",
        "franchise_territory",
        "franchise_region",
        "franchise_nation",
        "vision",
        "mission",
        "values",
        "services",
        "benefits",
        "foundation",
        "registration",
        "subscription",
        "doubts",
        "income_guarantee",
        "additional_opportunities"
    ];

    if (specificIntents.includes(intent)) {
        return 80;
    }

    if (
        intent === "physical_franchise" ||
        intent === "digital_franchise" ||
        intent === "franchise_structure"
    ) {
        return 100;
    }

    if (intent === "count") {
        return 50;
    }

    // If question is very specific but doesn't have a known intent,
    // require stronger evidence.
    const tokens = tokenize(q).filter(
        word => !stopWords.has(word)
    );

    if (tokens.length >= 3) {
        return 45;
    }

    return 30;
}

// ============================================================
// SPECIAL SCORE BOOSTS
// ============================================================

function applySpecialQuestionRules(
    chunk,
    question,
    intent,
    currentScore
) {

    const q = normalize(question);

    const title = normalize(chunk.title || "");
    const content = normalize(chunk.content || "");
    const section = normalize(chunk.section || "");

    let score = currentScore;

    // ========================================================
    // COMMON DOUBTS
    // ========================================================

    if (intent === "doubts") {

        if (
            title.includes(
                "source based doubt handling"
            )
        ) {
            score += 1000;
        }

        const doubtTerms = [
            "doubt",
            "doubts",
            "scam",
            "income",
            "guarantee",
            "risk",
            "time required",
            "previous experience"
        ];

        for (const term of doubtTerms) {

            if (q.includes(term)) {

                if (content.includes(term)) {
                    score += 100;
                }

                if (section.includes(term)) {
                    score += 50;
                }
            }
        }
    }

    // ========================================================
    // INCOME GUARANTEE
    // ========================================================

    if (intent === "income_guarantee") {

        if (
            title.includes(
                "source based doubt handling"
            )
        ) {
            score += 1200;
        }

        const guaranteeTerms = [
            "income is not guaranteed",
            "income not guaranteed",
            "does not guarantee income",
            "income",
            "guarantee",
            "guaranteed",
            "profit",
            "returns"
        ];

        for (const term of guaranteeTerms) {

            if (content.includes(term)) {
                score += 150;
            }
        }

        // Strongly penalize generic overview chunks.
        if (
            title === "zyngram overview" ||
            title === "zyngram ecosystem and platform structure"
        ) {
            score -= 500;
        }
    }

    // ========================================================
    // ADDITIONAL OPPORTUNITIES
    // ========================================================

    if (intent === "additional_opportunities") {

        if (
            title ===
            "additional franchise opportunity systems"
        ) {
            score += 1000;
        }

        const opportunityTerms = [
            "referral",
            "affiliate",
            "bonus",
            "bonus pool",
            "royalty",
            "reward",
            "achievement",
            "opportunity"
        ];

        for (const term of opportunityTerms) {

            if (q.includes(term)) {

                if (content.includes(term)) {
                    score += 120;
                }
            }
        }
    }

    // ========================================================
    // PHYSICAL SEQUENCE
    // ========================================================

    if (
        q.includes("after point") ||
        q.includes("comes after the point") ||
        q.includes("next level after point")
    ) {

        if (
            title === "physical franchise structure"
        ) {
            score += 1200;
        }

        if (
            content.includes(
                "point center hub command"
            )
        ) {
            score += 500;
        }
    }

    if (
        q.includes("after center") ||
        q.includes("comes after the center") ||
        q.includes("next level after center")
    ) {

        if (
            title === "physical franchise structure"
        ) {
            score += 1200;
        }
    }

    if (
        q.includes("after hub") ||
        q.includes("comes after the hub") ||
        q.includes("next level after hub")
    ) {

        if (
            title === "physical franchise structure"
        ) {
            score += 1200;
        }
    }

    return score;
}

// ============================================================
// RETRIEVE RELEVANT CHUNKS
// ============================================================

function retrieveRelevantChunks(question, options = {}) {

    const topK = options.limit || DEFAULT_TOP_K;

    const normalizedQuery = normalize(question);

    // ========================================================
    // EMPTY QUESTION
    // ========================================================

    if (!normalizedQuery) {
        return [];
    }

    // ========================================================
    // RELATED CHECK
    // ========================================================

    if (!isZyngramRelated(normalizedQuery)) {

        console.log(
            "[RAG] Rejected unrelated query:",
            normalizedQuery
        );

        return [];
    }

    // ========================================================
    // DATABASE
    // IMPORTANT: better-sqlite3
    // ========================================================

    let chunks;

    try {

        chunks = db
            .prepare(`
                SELECT
                    kc.id,
                    kc.document_id,
                    kc.title,
                    kc.category,
                    kc.section,
                    kc.version,
                    kc.source,
                    kc.status,
                    kc.content
                FROM knowledge_chunks AS kc
                INNER JOIN knowledge_documents AS kd
                    ON kd.id = kc.document_id
                WHERE UPPER(TRIM(kc.status)) = 'APPROVED'
                AND UPPER(TRIM(kd.status)) = 'APPROVED'
            `)
            .all();

    } catch (error) {

        console.error(
            "[RAG] Database retrieval error:",
            error
        );

        return [];
    }

    if (!chunks || chunks.length === 0) {
        return [];
    }

    // ========================================================
    // DETECT INTENT
    // ========================================================

    const intent = detectIntent(normalizedQuery);

    console.log("");
    console.log("==============================================");
    console.log("[RAG] Query:", normalizedQuery);
    console.log("[RAG] Intent:", intent);
    console.log("==============================================");

    // ========================================================
    // SCORE ALL CHUNKS
    // ========================================================

    const scored = chunks
        .map(chunk => {

            let score = calculateScore(
                chunk,
                normalizedQuery,
                intent
            );

            score = applySpecialQuestionRules(
                chunk,
                normalizedQuery,
                intent,
                score
            );

            return {
                ...chunk,
                score
            };
        })
        .sort(
            (a, b) => b.score - a.score
        );

    // ========================================================
    // DEBUG TOP CANDIDATES
    // ========================================================

    console.log("[RAG] Top candidates:");

    scored
        .slice(0, 5)
        .forEach((chunk, index) => {

            console.log(
                `${index + 1}. ${chunk.title} | Score: ${chunk.score}`
            );
        });

    // ========================================================
    // MINIMUM RELEVANCE
    // ========================================================

    const minimumScore = getMinimumScore(
        intent,
        normalizedQuery
    );

    const relevant = scored.filter(
        chunk => chunk.score >= minimumScore
    );

    // ========================================================
    // NO RELEVANT KNOWLEDGE
    // ========================================================

    if (relevant.length === 0) {

        console.log(
            "[RAG] No sufficiently relevant approved knowledge found."
        );

        console.log(
            "[RAG] Minimum required score:",
            minimumScore
        );

        return [];
    }

    // ========================================================
    // SPECIAL: PHYSICAL FRANCHISE
    // ========================================================

    if (
        intent === "physical_franchise" ||
        intent === "franchise_structure"
    ) {

        const physical = relevant.filter(chunk => {

            const title = normalize(
                chunk.title || ""
            );

            const content = normalize(
                chunk.content || ""
            );

            return (
                title.includes(
                    "physical franchise structure"
                ) ||
                (
                    content.includes("point") &&
                    (
                        content.includes("center") ||
                        content.includes("centre")
                    ) &&
                    content.includes("hub") &&
                    content.includes("command")
                )
            );
        });

        if (physical.length > 0) {

            console.log(
                "[RAG] Selected source:",
                physical[0].title
            );

            console.log(
                "[RAG] Score:",
                physical[0].score
            );

            return physical.slice(0, topK);
        }
    }

    // ========================================================
    // SPECIAL: DIGITAL FRANCHISE
    // ========================================================

    if (intent === "digital_franchise") {

        const digital = relevant.filter(chunk => {

            const title = normalize(
                chunk.title || ""
            );

            const content = normalize(
                chunk.content || ""
            );

            return (
                title.includes(
                    "digital franchise structure"
                ) ||
                (
                    content.includes("zone") &&
                    content.includes("territory") &&
                    content.includes("region") &&
                    content.includes("nation")
                )
            );
        });

        if (digital.length > 0) {

            console.log(
                "[RAG] Selected source:",
                digital[0].title
            );

            console.log(
                "[RAG] Score:",
                digital[0].score
            );

            return digital.slice(0, topK);
        }
    }

    // ========================================================
    // SPECIAL: COMMON DOUBTS
    // ========================================================

    if (intent === "doubts") {

        const doubtChunks = relevant.filter(chunk =>
            normalize(chunk.title || "").includes(
                "source based doubt handling"
            )
        );

        if (doubtChunks.length > 0) {

            console.log(
                "[RAG] Doubt-handling source selected:",
                doubtChunks[0].title
            );

            console.log(
                "[RAG] Score:",
                doubtChunks[0].score
            );

            return doubtChunks.slice(0, topK);
        }
    }

    // ========================================================
    // SPECIAL: INCOME GUARANTEE
    // ========================================================

    if (intent === "income_guarantee") {

        const incomeChunks = relevant.filter(chunk => {

            const title = normalize(
                chunk.title || ""
            );

            const content = normalize(
                chunk.content || ""
            );

            return (
                title.includes(
                    "source based doubt handling"
                ) &&
                (
                    content.includes("income") ||
                    content.includes("guarantee")
                )
            );
        });

        if (incomeChunks.length > 0) {

            console.log(
                "[RAG] Income-guarantee source selected:",
                incomeChunks[0].title
            );

            console.log(
                "[RAG] Score:",
                incomeChunks[0].score
            );

            return incomeChunks.slice(0, topK);
        }
    }

    // ========================================================
    // SPECIAL: ADDITIONAL OPPORTUNITIES
    // ========================================================

    if (intent === "additional_opportunities") {

        const opportunityChunks = relevant.filter(
            chunk =>
                normalize(chunk.title || "") ===
                "additional franchise opportunity systems"
        );

        if (opportunityChunks.length > 0) {

            console.log(
                "[RAG] Opportunity source selected:",
                opportunityChunks[0].title
            );

            console.log(
                "[RAG] Score:",
                opportunityChunks[0].score
            );

            return opportunityChunks.slice(0, topK);
        }
    }

    // ========================================================
    // SPECIFIC ENTITY QUESTIONS
    // ========================================================

    const specificIntents = [
        "franchise_point",
        "franchise_center",
        "franchise_hub",
        "franchise_command",
        "digital_node",
        "franchise_zone",
        "franchise_territory",
        "franchise_region",
        "franchise_nation",
        "vision",
        "mission",
        "values",
        "services",
        "benefits",
        "ecosystem",
        "foundation",
        "registration",
        "subscription"
    ];

    if (specificIntents.includes(intent)) {

        console.log(
            "[RAG] Selected source:",
            relevant[0].title
        );

        console.log(
            "[RAG] Score:",
            relevant[0].score
        );

        return relevant.slice(0, topK);
    }

    // ========================================================
    // COUNT QUESTIONS
    // ========================================================

    if (intent === "count") {

        return relevant.slice(0, topK);
    }

    // ========================================================
    // GENERAL / OVERVIEW
    // ========================================================

    console.log(
        "[RAG] Selected source:",
        relevant[0].title
    );

    console.log(
        "[RAG] Score:",
        relevant[0].score
    );

    return relevant.slice(0, topK);
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    retrieveRelevantChunks,
    detectIntent,
    detectEntity,
    isZyngramRelated,
    calculateScore,
    NO_ANSWER
};