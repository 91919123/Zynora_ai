# Zynora v1.1 - Production Version Plan 

## 1. Curret Version 

Zynora v1.0 is the exisiting RAG-based application.

### Current Technology Stack

- Frontend: React
- Build Tool: Vite
- HTTP Client: Axios
- Backed Node.js
- API Framework: Express
- Database: SQLite
- Database Library: better-qlite3
- RAG: Knowledge-base retrival system 

## 2. Target Version 

Zynora V1.1 will upgrade the existing application toward production rediness.

## 3. Production Improvements
### 3.1 Conversation Management

Introduce user-owned conversations and message history. 

### context - Aware RAG

Use relevant conversation history together with approved knowledge-base content
during retrieval and answer generation.

### AI Evaluation 

Evaluate generated answers for relevance and groundedness. 

### Production Logging

Record important application events with useful diagnostic
information.

### Monitoring

Track application health, API errors, response times and
important AI/RAG metrics.

### Security

Improve authentication, authorization, input validation and
abuse protection.

## 4. Database Changes

The existing SQLite database will be extended rather than
replaced.

Existing tables such as:

- users
- knowledge_documents
- knowledge_chunks
- chat_history
- audit_logs

will be preserved where possible.

New database structures will be introduced only when required
for the production features.

## 5. API Changes

New or updated APIs will be introduced for:

- Conversations
- Messages
- Context-aware chat
- Evaluation
- Monitoring

Existing APIs should remain compatible wherever possible.

## 6. Testing Strategy

Before release:

1. Test existing functionality.
2. Test authentication.
3. Test conversation ownership.
4. Test RAG retrieval.
5. Test context-aware questions.
6. Test AI evaluation.
7. Test API error handling.
8. Test frontend functionality.
9. Test database operations.
10. Test production build.

## 7. Deployment Strategy

The release should be deployed in a controlled manner.

The existing v1.0 version should remain available until v1.1
has been verified.

## 8. Rollback Strategy

If v1.1 causes critical failures:

1. Stop the new release.
2. Restore the previous application version.
3. Restore the database backup if required.
4. Verify the application.
5. Investigate the failure.
6. Fix the issue before attempting another deployment.

## 9. Success Criteria

Zynora v1.1 will be considered successful when:

- Existing functionality continues to work.
- Users can manage their own conversations.
- Conversation context improves RAG responses.
- AI responses can be evaluated.
- Important production events are logged.
- Application health can be monitored.
- Security controls are enforced.
- The application can be safely rolled back.