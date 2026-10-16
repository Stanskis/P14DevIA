# Architecture

## Structure du dépôt

```
.
├── .github/workflows/tests.yml   # CI : lance pytest
├── README.md
├── docs/
│   ├── ARCHITECTURE.md           # ce fichier
│   └── DECISIONS.md              # choix techniques et raisons
├── backend/
│   ├── pyproject.toml            # dépendances, configuration de pytest
│   ├── uv.lock
│   ├── .env.example
│   ├── src/
│   │   ├── main.py               # application FastAPI, CORS, routeurs
│   │   ├── config.py             # lecture des variables d'environnement
│   │   ├── security.py           # hash des mots de passe, création des JWT
│   │   ├── auth.py               # POST /login et dépendance get_current_user
│   │   ├── database.py           # engine, get_session, init_db
│   │   ├── models.py             # User, Chat, schémas de réponse
│   │   ├── news.py               # client World News API (top-news, search-news)
│   │   ├── agent.py              # agent de chat (outil de recherche, prompt)
│   │   ├── review_agent.py       # agent de revue de presse (sortie structurée)
│   │   └── routes/
│   │       ├── chats.py          # /chats, messages, tentatives de reprise LLM
│   │       └── reviews.py        # /chats/{id}/review et /reviews
│   └── tests/
│       ├── conftest.py           # fixtures : base SQLite, faux LLM, utilisateurs
│       ├── test_auth.py          # authentification et autorisations
│       └── test_chats.py         # fonctionnalités du chat
└── frontend/
    ├── app/
    │   ├── layout.tsx            # AuthProvider
    │   ├── page.tsx              # écran principal (menu + panneau de chat)
    │   └── login/page.tsx        # connexion en deux étapes (email, puis mot de passe)
    ├── components/
    │   ├── Menu.tsx              # liste des discussions, déconnexion
    │   ├── ConversationItem.tsx  # une discussion dans le menu
    │   ├── ChatPanel.tsx         # chat, onglet revues, modale de génération
    │   ├── ReviewCard.tsx        # affichage d'une revue de presse
    │   └── LoginForm.tsx
    ├── context/AuthContext.tsx   # token, login, logout
    ├── lib/api.ts                # appels à l'API (fetchWithAuth)
    ├── lib/format.ts             # formatage des dates et heures
    └── types/types.ts
```

## Dépendances entre modules du backend

```
main  → auth, routes.chats, routes.reviews, config, database
auth  → security, config, database, models
routes.chats   → auth, agent, news, database, models
routes.reviews → auth, review_agent, routes.chats (get_own_chat, with_retry, load_history)
agent / review_agent → news
database → security, models
security → config
```

Il n'y a pas de dépendance circulaire.

## Modèle de données

Deux tables.

**`user`**

| Colonne           | Type                    | Remarque    |
| ----------------- | ----------------------- | ----------- |
| `id`              | int, PK                 |             |
| `email`           | varchar, unique, indexé |             |
| `hashed_password` | varchar                 | hash bcrypt |

**`chat`**

| Colonne             | Type                         | Remarque                                   |
| ------------------- | ---------------------------- | ------------------------------------------ |
| `id`                | int, PK                      |                                            |
| `user_id`           | int, FK → `user.id`, indexé  | propriétaire                               |
| `created_at`        | timestamp (UTC, sans fuseau) |                                            |
| `messages`          | JSON                         | historique complet au format PydanticAI    |
| `system_prompt`     | varchar, nullable            | prompt système figé à la première question |
| `review_title`      | varchar, nullable            | titre de la revue de presse                |
| `review_summary`    | varchar, nullable            | synthèse générale                          |
| `review_articles`   | JSON, nullable               | liste `{title, summary, url}`              |
| `review_created_at` | timestamp, nullable          | date de génération                         |

Une discussion porte au plus une revue de presse : générer à nouveau remplace la précédente.

## API

Toutes les routes, sauf `/login`, exigent l'en-tête `Authorization: Bearer <token>`.

| Méthode | Route                  | Description                                                 |
| ------- | ---------------------- | ----------------------------------------------------------- |
| POST    | `/login`               | `{email, password}` → `{access_token, token_type}`          |
| GET     | `/chats`               | discussions de l'utilisateur, les plus récentes d'abord     |
| POST    | `/chats`               | crée une discussion (201)                                   |
| GET     | `/chats/{id}`          | historique de la discussion                                 |
| POST    | `/chats/{id}/messages` | `{content}` → discussion mise à jour avec la réponse du LLM |
| POST    | `/chats/{id}/review`   | `{theme}` → génère et enregistre la revue de presse         |
| GET     | `/reviews`             | revues de presse de toutes les discussions de l'utilisateur |

Codes d'erreur : 401 (token absent, invalide ou expiré, mauvais identifiants),
403 (discussion d'un autre utilisateur), 404 (discussion inexistante),
400 (génération de revue sur une discussion vide),
503 (LLM indisponible après plusieurs tentatives).

Les messages renvoyés par l'API ont la forme `{role: "user" | "assistant", content, created_at}`.

## Flux d'un message

```
Frontend ──POST /chats/{id}/messages──▶ routes/chats.py
   1. vérifie que la discussion appartient à l'utilisateur (sinon 403)
   2. recharge l'historique PydanticAI depuis chat.messages
   3. si chat.system_prompt est vide : appelle /top-news, construit le prompt
      et le sauvegarde dans chat.system_prompt
   4. lance news_agent avec l'historique et le prompt (deps)
        └─ l'agent peut appeler l'outil search_news_tool → /search-news
   5. enregistre l'historique complet mis à jour dans chat.messages
   6. renvoie la discussion, filtrée par to_display_messages
```

## Flux d'une revue de presse

```
Frontend ──POST /chats/{id}/review {theme}──▶ routes/reviews.py
   1. vérifie la propriété de la discussion, refuse si l'historique est vide (400)
   2. lance review_agent (sans outils) avec tout l'historique du chat
   3. la sortie est un objet PressReview validé par PydanticAI
   4. écrit titre, synthèse et articles dans les colonnes review_* du chat
```
