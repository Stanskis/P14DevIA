# NewsFoundry

Assistant de revue de presse basé sur un LLM. L'utilisateur discute avec un agent
qui connaît l'actualité du jour (World News API), peut approfondir un sujet
(recherche d'articles) et générer une revue de presse à partir d'une discussion.

## Documentation

| Fichier | Contenu |
|---|---|
| `README.md` | Installation, lancement, tests (ce fichier) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Structure du code, modèle de données, routes de l'API |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Choix techniques, raisons, limites connues |

## Stack

- **Backend** : Python 3.13, FastAPI, SQLModel, PostgreSQL 17, PydanticAI, JWT, bcrypt
- **LLM** : Google Gemini (modèle principal + modèle de secours)
- **Données d'actualité** : World News API (`/top-news`, `/search-news`)
- **Frontend** : Next.js (App Router), TypeScript, Tailwind CSS
- **Tests / CI** : pytest, GitHub Actions
- **Déploiement** : Vercel (frontend) + Railway (backend et base PostgreSQL)

## Application déployée

Frontend : <https://p14-dev-ia.vercel.app>

Le frontend est hébergé sur **Vercel** et appelle l'API hébergée sur **Railway**
(voir la section « Déploiement » ci-dessous).

## Prérequis

- Docker
- [uv](https://docs.astral.sh/uv/) (gestionnaire de dépendances Python)
- Node.js et npm
- Une clé API Google AI Studio : <https://aistudio.google.com/apikey>
- Une clé API World News API : <https://worldnewsapi.com>

## Lancer le projet

### 1. Base de données

```bash
docker run -d \
  --name newsfoundry_db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=newsfoundry \
  -p 5432:5432 \
  postgres:17
```

Si le conteneur existe déjà : `docker start newsfoundry_db`.
Si le port 5432 est occupé par un autre projet, arrêter l'autre conteneur
ou changer le port (et `DATABASE_URL`).

### 2. Backend

```bash
cd backend
cp .env.example .env      # puis renseigner les valeurs
uv sync
uv run --env-file .env uvicorn src.main:app --reload
```

L'API écoute sur <http://localhost:8000> (documentation interactive : `/docs`).
Au démarrage, les tables sont créées et un utilisateur de développement
est ajouté : `test@test.com` / `test`.

#### Variables d'environnement (`backend/.env`)

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL, ex. `postgresql://user:password@127.0.0.1:5432/newsfoundry` | oui |
| `SECRET_KEY` | Clé de signature des JWT (32 caractères minimum) | oui |
| `LLM_MODEL` | Modèle principal, ex. `google:gemini-3.6-flash` | oui |
| `LLM_FALLBACK_MODEL` | Modèle de secours utilisé si le principal échoue | non |
| `GOOGLE_API_KEY` | Clé Gemini | oui |
| `WORLD_NEWS_API_KEY` | Clé World News API | oui (sans elle, l'agent répond sans actualités) |
| `ALGORITHM` | Algorithme JWT (défaut `HS256`) | non |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de vie du token (défaut `720`) | non |
| `CORS_ORIGINS` | Origines autorisées, séparées par des virgules (défaut `http://localhost:3000`) | non |

Générer une `SECRET_KEY` :

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

> Le fichier `.env` n'est jamais versionné. Seul `.env.example` (sans valeurs) l'est.
> Les variables sont lues au démarrage : après modification de `.env`, relancer le backend.

### 3. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Application sur <http://localhost:3000>.

## Déploiement

| Partie | Hébergeur | Détails |
|---|---|---|
| Frontend (Next.js) | Vercel | dossier racine `frontend`, déploiement automatique à chaque `push` |
| Backend (FastAPI) | Railway | dossier racine `backend`, déploiement automatique à chaque `push` |
| Base de données | Railway (PostgreSQL) | `DATABASE_URL` fournie par Railway |

### Backend sur Railway

- Commande de démarrage (sans `--reload` ni `--env-file`) :

  ```bash
  uvicorn src.main:app --host 0.0.0.0 --port $PORT
  ```

- Les variables d'environnement se configurent dans l'onglet **Variables** de Railway
  (mêmes noms que dans `backend/.env.example`). Sans `SECRET_KEY`, l'application
  ne démarre pas.
- `CORS_ORIGINS` doit contenir l'URL du frontend : `https://p14-dev-ia.vercel.app`
  (plusieurs origines possibles, séparées par des virgules).

### Frontend sur Vercel

- Variable d'environnement `NEXT_PUBLIC_API_URL` : URL publique du backend Railway
  (sans `/` final). Elle est intégrée au build : après modification, redéployer le frontend.

### Points d'attention en production

- `init_db` crée l'utilisateur de développement `test@test.com` au démarrage :
  à supprimer ou à désactiver pour un usage réel.
- Les tests (`uv run pytest -v`) tournent en CI GitHub Actions ; Vercel et Railway
  déploient indépendamment de leur résultat.

## Lancer les tests

Depuis le dossier `backend` :

```bash
uv run pytest -v
```

Les tests n'ont besoin ni de Docker, ni de clés API, ni d'accès réseau :

- la base est une SQLite en mémoire ;
- le LLM est remplacé par `TestModel` de PydanticAI
  (et `models.ALLOW_MODEL_REQUESTS = False` fait échouer tout appel réel) ;
- les appels à la World News API sont remplacés par des fonctions factices.

La même commande est exécutée en CI à chaque `push` et `pull_request`
(`.github/workflows/tests.yml`).

## Ce que couvrent les tests

- création de discussion, envoi de message, réponse du LLM ;
- conservation de l'historique entre deux messages ;
- le prompt système n'est pas renvoyé à l'utilisateur ;
- le prompt système (avec les actualités) est sauvegardé en base et ne change plus ;
- l'agent appelle bien l'outil de recherche d'articles ;
- autorisations : sans token → refusé, token invalide → 401,
  lecture ou écriture dans la discussion d'un autre utilisateur → 403,
  discussion inexistante → 404.

La génération de revue de presse (`/chats/{id}/review`, `/reviews`) n'est pas couverte
par des tests automatisés (voir « Limites connues » dans `docs/DECISIONS.md`).
