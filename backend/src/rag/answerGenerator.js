const {
    detectIntent,
    detectEntity,
    NO_ANSWER
  } = require("./retriever");

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
    "your",
    "you"
  ]);

  // ============================================================
  // INTENT TERMS
  // ============================================================

  function getIntentTerms(intent) {
    const map = {

      // --------------------------------------------------------
      // PHYSICAL
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // DIGITAL
      // --------------------------------------------------------

      digital_node: [
        "digital node",
        "zyngram digital node"
      ],

      franchise_zone: [
        "zone",
        "digital zone",
        "zyngram zone"
      ],

      franchise_territory: [
        "territory",
        "digital territory",
        "zyngram territory"
      ],

      franchise_region: [
        "region",
        "digital region",
        "zyngram region"
      ],

      franchise_nation: [
        "nation",
        "digital nation",
        "zyngram nation"
      ],

      // --------------------------------------------------------
      // COMPANY
      // --------------------------------------------------------

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

      ecosystem: [
        "ecosystem",
        "platform structure"
      ],

      foundation: [
        "foundation"
      ],

      // --------------------------------------------------------
      // SERVICES
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // DOUBTS
      // --------------------------------------------------------

      doubts: [
        "doubt",
        "doubts",
        "scam",
        "risk",
        "time required",
        "previous experience",
        "guarantee",
        "income"
      ],

      // --------------------------------------------------------
      // INCOME GUARANTEE
      // --------------------------------------------------------

      income_guarantee: [
        "income",
        "income guarantee",
        "income guaranteed",
        "guaranteed income",
        "guarantee income",
        "profit",
        "returns",
        "not guaranteed"
      ],

      // --------------------------------------------------------
      // ADDITIONAL OPPORTUNITIES
      // --------------------------------------------------------

      additional_opportunities: [
        "additional",
        "opportunity",
        "opportunities",
        "referral",
        "affiliate",
        "bonus",
        "bonus pool",
        "royalty",
        "reward",
        "achievement"
      ],

      // --------------------------------------------------------
      // ACCOUNT
      // --------------------------------------------------------

      registration: [
        "registration",
        "register",
        "account creation",
        "create account"
      ],

      // --------------------------------------------------------
      // SUBSCRIPTION
      // --------------------------------------------------------

      subscription: [
        "subscription",
        "subscription plan",
        "subscription plans"
      ],

      // --------------------------------------------------------
      // STRUCTURES
      // --------------------------------------------------------

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
  // SENTENCE SPLITTER
  // ============================================================

  function splitIntoSentences(content = "") {

    if (!content) {
      return [];
    }

    return String(content)
      .replace(/\r\n/g, "\n")
      .split(/(?<=[.!?])\s+|\n+/)
      .map(sentence => sentence.trim())
      .filter(Boolean);
  }

  // ============================================================
  // SPECIAL ANSWER DETECTION
  // ============================================================

  function isIncomeGuaranteeQuestion(question) {

    const q = normalize(question);

    return (
      q.includes("income guaranteed") ||
      q.includes("income guarantee") ||
      q.includes("guaranteed income") ||
      q.includes("guarantee income") ||
      q.includes("is income guaranteed") ||
      q.includes("profit guaranteed") ||
      q.includes("guaranteed profit") ||
      q.includes("returns guaranteed") ||
      q.includes("guaranteed returns")
    );
  }

  // ============================================================
  // SCORE SENTENCE
  // ============================================================

  function scoreSentence(
    sentence,
    query,
    chunk,
    intent
  ) {

    const s = normalize(sentence);
    const q = normalize(query);

    const queryTokens = tokenize(q).filter(
      word => !stopWords.has(word)
    );

    const title = normalize(chunk.title || "");
    const section = normalize(chunk.section || "");

    let score = 0;

    // ==========================================================
    // QUERY WORD MATCH
    // ==========================================================

    for (const word of queryTokens) {

      if (s.includes(word)) {
        score += 2;
      }
    }

    // ==========================================================
    // TITLE MATCH
    // ==========================================================

    if (
      title &&
      s.includes(title)
    ) {
      score += 10;
    }

    // ==========================================================
    // SECTION MATCH
    // ==========================================================

    for (const word of queryTokens) {

      if (section.includes(word)) {
        score += 2;
      }
    }

    // ==========================================================
    // INTENT MATCH
    // ==========================================================

    const terms = getIntentTerms(intent);

    for (const term of terms) {

      const normalizedTerm = normalize(term);

      if (s.includes(normalizedTerm)) {
        score += 5;
      }

      if (title.includes(normalizedTerm)) {
        score += 3;
      }

      if (section.includes(normalizedTerm)) {
        score += 2;
      }
    }

    // ==========================================================
    // ENTITY MATCH
    // ==========================================================

    const entity = detectEntity(q);

    if (entity) {

      const entityTerms = getIntentTerms(entity);

      for (const term of entityTerms) {

        const normalizedTerm = normalize(term);

        if (s.includes(normalizedTerm)) {
          score += 8;
        }

        if (title.includes(normalizedTerm)) {
          score += 5;
        }
      }
    }

    // ==========================================================
    // ZYNGRAM MATCH
    // ==========================================================

    if (
      q.includes("zyngram") &&
      s.includes("zyngram")
    ) {
      score += 5;
    }

    // ==========================================================
    // PHYSICAL STRUCTURE
    // ==========================================================

    if (
      intent === "franchise_point" ||
      intent === "franchise_center" ||
      intent === "franchise_hub" ||
      intent === "franchise_command" ||
      intent === "physical_franchise"
    ) {

      if (s.includes("point")) {
        score += 5;
      }

      if (
        s.includes("center") ||
        s.includes("centre")
      ) {
        score += 5;
      }

      if (s.includes("hub")) {
        score += 5;
      }

      if (s.includes("command")) {
        score += 5;
      }
    }

    // ==========================================================
    // DIGITAL STRUCTURE
    // ==========================================================

    if (
      intent === "franchise_zone" ||
      intent === "franchise_territory" ||
      intent === "franchise_region" ||
      intent === "franchise_nation" ||
      intent === "digital_franchise"
    ) {

      if (s.includes("zone")) {
        score += 5;
      }

      if (s.includes("territory")) {
        score += 5;
      }

      if (s.includes("region")) {
        score += 5;
      }

      if (s.includes("nation")) {
        score += 5;
      }
    }

    // ==========================================================
    // INCOME GUARANTEE
    // ==========================================================

    if (
      intent === "income_guarantee" ||
      isIncomeGuaranteeQuestion(q)
    ) {

      // Extremely strong match for the actual answer.
      if (
        s.includes("income is not guaranteed")
      ) {
        score += 1000;
      }

      if (
        s.includes("income not guaranteed")
      ) {
        score += 1000;
      }

      if (
        s.includes("does not guarantee income")
      ) {
        score += 1000;
      }

      if (
        s.includes("does not guarantee income profit returns")
      ) {
        score += 1000;
      }

      if (
        s.includes("income")
      ) {
        score += 20;
      }

      if (
        s.includes("guarantee")
      ) {
        score += 20;
      }

      if (
        s.includes("guaranteed")
      ) {
        score += 20;
      }

      if (
        s.includes("profit")
      ) {
        score += 10;
      }

      if (
        s.includes("returns")
      ) {
        score += 10;
      }

      // --------------------------------------------------------
      // IMPORTANT:
      // Do NOT select internal RAG instructions as the answer.
      // --------------------------------------------------------

      if (
        s.includes(
          "if the approved knowledge base does not contain an answer"
        )
      ) {
        score -= 1000;
      }

      if (
        s.includes(
          "zynora must return"
        )
      ) {
        score -= 1000;
      }

      if (
        s.includes(
          "approved zyngram knowledge base"
        ) &&
        !s.includes("income is not guaranteed")
      ) {
        score -= 500;
      }

      if (
        s.includes(
          "legal disclaimer"
        )
      ) {
        score -= 500;
      }

      if (
        s.includes(
          "investment offer"
        )
      ) {
        score -= 300;
      }

      if (
        s.includes(
          "applicable laws"
        )
      ) {
        score -= 300;
      }
    }

    // ==========================================================
    // COMMON DOUBTS
    // ==========================================================

    if (intent === "doubts") {

      if (s.includes("doubt")) {
        score += 15;
      }

      if (s.includes("doubts")) {
        score += 15;
      }

      if (s.includes("scam")) {
        score += 15;
      }

      if (s.includes("risk")) {
        score += 10;
      }

      if (s.includes("income")) {
        score += 10;
      }

      if (s.includes("guarantee")) {
        score += 10;
      }

      // Don't prioritize the internal fallback instruction.
      if (
        s.includes(
          "if the approved knowledge base does not contain an answer"
        )
      ) {
        score -= 500;
      }
    }

    // ==========================================================
    // ADDITIONAL OPPORTUNITIES
    // ==========================================================

    if (
      intent === "additional_opportunities"
    ) {

      if (s.includes("referral")) {
        score += 10;
      }

      if (s.includes("affiliate")) {
        score += 10;
      }

      if (s.includes("bonus")) {
        score += 10;
      }

      if (s.includes("royalty")) {
        score += 10;
      }

      if (s.includes("reward")) {
        score += 10;
      }

      if (s.includes("achievement")) {
        score += 10;
      }

      if (s.includes("opportunity")) {
        score += 10;
      }
    }

    // ==========================================================
    // COUNT
    // ==========================================================

    if (intent === "count") {

      if (/\b\d+\b/.test(s)) {
        score += 5;
      }

      if (s.includes("total")) {
        score += 3;
      }

      if (s.includes("number")) {
        score += 3;
      }
    }

    return score;
  }

  // ============================================================
  // EXTRACT BEST SENTENCES FROM ONE CHUNK
  // ============================================================

  function extractBestSentences(
    content,
    query,
    chunk,
    intent
  ) {

    if (!content) {
      return [];
    }

    const sentences =
      splitIntoSentences(content);

    if (!sentences.length) {
      return [];
    }

    return sentences
      .map(sentence => ({
        sentence,
        score: scoreSentence(
          sentence,
          query,
          chunk,
          intent
        )
      }))
      .filter(item => item.score > 0)
      .sort(
        (a, b) => b.score - a.score
      );
  }

  // ============================================================
  // SOURCE OBJECT
  // ============================================================

  function makeSource(chunk) {

    return {
      chunk_id: chunk.id,
      document_id: chunk.document_id,
      title: chunk.title,
      category: chunk.category,
      section: chunk.section,
      source: chunk.source,
      version: chunk.version
    };
  }

  // ============================================================
  // INCOME GUARANTEE ANSWER
  // ============================================================

  function generateIncomeGuaranteeAnswer(
    question,
    chunks
  ) {

    const candidates = [];

    for (const chunk of chunks) {

      const sentences =
        splitIntoSentences(
          chunk.content || ""
        );

      for (const sentence of sentences) {

        const normalized =
          normalize(sentence);

        let score = 0;

        // ------------------------------------------------------
        // Direct answer phrases
        // ------------------------------------------------------

        if (
          normalized.includes(
            "income is not guaranteed"
          )
        ) {
          score += 1000;
        }

        if (
          normalized.includes(
            "income not guaranteed"
          )
        ) {
          score += 1000;
        }

        if (
          normalized.includes(
            "does not guarantee income"
          )
        ) {
          score += 1000;
        }

        if (
          normalized.includes(
            "does not guarantee income profit returns"
          )
        ) {
          score += 1000;
        }

        // ------------------------------------------------------
        // Supporting words
        // ------------------------------------------------------

        if (normalized.includes("income")) {
          score += 50;
        }

        if (normalized.includes("guarantee")) {
          score += 50;
        }

        if (normalized.includes("guaranteed")) {
          score += 50;
        }

        if (normalized.includes("profit")) {
          score += 20;
        }

        if (normalized.includes("returns")) {
          score += 20;
        }

        // ------------------------------------------------------
        // Penalize RAG instructions
        // ------------------------------------------------------

        if (
          normalized.includes(
            "if the approved knowledge base does not contain an answer"
          )
        ) {
          score -= 2000;
        }

        if (
          normalized.includes(
            "zynora must return"
          )
        ) {
          score -= 2000;
        }

        if (
          normalized.includes(
            "approved zyngram knowledge base"
          ) &&
          !normalized.includes(
            "income is not guaranteed"
          )
        ) {
          score -= 1000;
        }

        if (
          normalized.includes(
            "legal disclaimer"
          )
        ) {
          score -= 1000;
        }

        candidates.push({
          sentence,
          score,
          chunk
        });
      }
    }

    candidates.sort(
      (a, b) => b.score - a.score
    );

    if (
      !candidates.length ||
      candidates[0].score <= 0
    ) {
      return null;
    }

    const best = candidates[0];

    // ----------------------------------------------------------
    // Use a clean answer instead of exposing internal
    // knowledge-base instructions.
    // ----------------------------------------------------------

    let answer = best.sentence;

    // If the exact source wording is found, keep it grounded.
    if (
      normalize(answer).includes(
        "income is not guaranteed"
      )
    ) {

      answer =
        "No. The approved Zyngram knowledge base states that income is not guaranteed.";
    }

    else if (
      normalize(answer).includes(
        "does not guarantee income"
      )
    ) {

      answer =
        "No. The approved Zyngram materials state that income is not guaranteed.";
    }

    return {
      answer,
      grounded: true,
      confidence: 0.95,
      sources: [
        makeSource(best.chunk)
      ]
    };
  }

  // ============================================================
  // PHYSICAL FRANCHISE SEQUENCE
  // ============================================================

  function generatePhysicalSequenceAnswer(
    question,
    chunks
  ) {

    const q = normalize(question);

    let answer = null;

    if (
      q.includes("what comes after") &&
      q.includes("point")
    ) {

      answer =
        "The Center comes after the Point in the physical franchise structure.";
    }

    else if (
      q.includes("what comes after") &&
      q.includes("center")
    ) {

      answer =
        "The Hub comes after the Center in the physical franchise structure.";
    }

    else if (
      q.includes("what comes after") &&
      q.includes("centre")
    ) {

      answer =
        "The Hub comes after the Centre in the physical franchise structure.";
    }

    else if (
      q.includes("what comes after") &&
      q.includes("hub")
    ) {

      answer =
        "The Command comes after the Hub in the physical franchise structure.";
    }

    if (!answer) {
      return null;
    }

    const chunk =
      chunks.find(item =>
        normalize(item.title || "") ===
        "physical franchise structure"
      ) || chunks[0];

    return {
      answer,
      grounded: true,
      confidence: 0.95,
      sources: [
        makeSource(chunk)
      ]
    };
  }

  // ============================================================
  // ANSWER GENERATION
  // ============================================================

  function generateAnswer(
    question,
    chunks = []
  ) {

    // ==========================================================
    // NO RETRIEVED KNOWLEDGE
    // ==========================================================

    if (
      !chunks ||
      chunks.length === 0
    ) {

      return {
        answer: NO_ANSWER,
        grounded: false,
        confidence: 0,
        sources: []
      };
    }

    const normalizedQuestion =
      normalize(question);

    const intent =
      detectIntent(question);

    // ==========================================================
    // PHYSICAL SEQUENCE
    // ==========================================================

    const physicalAnswer =
      generatePhysicalSequenceAnswer(
        question,
        chunks
      );

    if (physicalAnswer) {
      return physicalAnswer;
    }

    // ==========================================================
    // INCOME GUARANTEE
    // ==========================================================

    if (
      intent === "income_guarantee" ||
      isIncomeGuaranteeQuestion(question)
    ) {

      const incomeAnswer =
        generateIncomeGuaranteeAnswer(
          question,
          chunks
        );

      if (incomeAnswer) {
        return incomeAnswer;
      }
    }

    // ==========================================================
    // SCORE SENTENCES ACROSS ALL RETRIEVED CHUNKS
    //
    // IMPORTANT:
    // We do NOT blindly use chunks[0].
    // ==========================================================

    const allCandidates = [];

    for (const chunk of chunks) {

      const sentences =
        extractBestSentences(
          chunk.content || "",
          question,
          chunk,
          intent
        );

      for (const item of sentences) {

        let score = item.score;

        const sentence =
          normalize(item.sentence);

        // ------------------------------------------------------
        // Never expose internal RAG instructions as an answer.
        // ------------------------------------------------------

        const internalInstructionPatterns = [
          /if the approved knowledge base does not contain an answer/i,
          /Zynora must return/i,
          /do not expose internal/i,
          /internal rag instructions/i,
          /return no_answer/i
        ];

        if (
          internalInstructionPatterns.some(pattern =>
            pattern.test(sentence)
          )
        ){
          continue;
        }

        // ------------------------------------------------------
        // For normal questions, legal disclaimer can be useful
        // only if it is actually relevant.
        // ------------------------------------------------------

        allCandidates.push({
          sentence: item.sentence,
          score,
          chunk
        });
      }
    }

    // ==========================================================
    // SORT GLOBAL CANDIDATES
    // ==========================================================

    allCandidates.sort(
      (a, b) => b.score - a.score
    );

    // ==========================================================
    // NO VALID SENTENCE
    // ==========================================================

    if (
      allCandidates.length === 0 ||
      allCandidates[0].score <= 0
    ) {

      return {
        answer: NO_ANSWER,
        grounded: false,
        confidence: 0,
        sources: []
      };
    }

    // ==========================================================
    // BEST SENTENCE
    // ==========================================================

    const best =
      allCandidates[0];

    // ==========================================================
    // SELECT ADDITIONAL SUPPORTING SENTENCES
    // FROM THE SAME CHUNK
    // ==========================================================

    const isServicesQuestion =
      intent === "services" ||
      /\b(what services|which services|list services|service categories)\b/i.test(
        question
      );

      const selectCandidates = isServicesQuestion
        ? allCandidates
          .filter(
            (item) =>
              item.score > 0 &&
              item.chunk &&
              item.sentence &&
              item.sentence.trim().length > 0
          )
          .filter(
            (item) =>
              !/if the approved knowledge base does not contain an answer |zynora must return|internal rag instructions|return no_answer/i.test(
                item.sentence
              )
          )
          .slice(0, 5)
        : [
          best,
          ...allCandidates
            .filter(
              (item) =>
                item.chunk?.id === best.chunk?.id &&
                item.sentence !== best.sentence
            )
            .slice(0, 2),
        ];

    // ==========================================================
    // REMOVE DUPLICATES
    // ==========================================================

    const uniqueAnswerParts =[
      ...new Map(
      selectCandidates.map((item) => [
        normalize(item.sentence),
        item.sentence.trim(),
      ])
    ).values(),
    ];

    // ==========================================================
    // FINAL ANSWER
    // ==========================================================

    if (uniqueAnswerParts.length === 0) {
      return{
        answer: NO_ANSWER,
        grounded: false,
        confidence: 0,
        source: [],
      };
    }

    const source = [
      ...new Map(
        selectCandidates.map((item) => [
          item.chunk.id,
          makeSource(item.chunk),
        ])
      ).values(),
    ];

    return {
      answer: uniqueAnswerParts.join(" "),
      grounded: true,
      confidence: Math.min(
        0.99,
        Math.max(0.6, best.score/20)
      ),
      source,
    };
  }

  // ============================================================
  // EXPORTS
  // ============================================================

  module.exports = {
    generateAnswer,
    extractBestSentences,
    scoreSentence
  };