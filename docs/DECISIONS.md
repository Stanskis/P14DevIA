# Choix techniques

Pour chaque choix : ce qui a été retenu, pourquoi, et ce que cela implique.

## Historique de discussion

**Choix.** L'historique complet est stocké dans une colonne JSON `Chat.messages`,
au format natif de PydanticAI (`ModelMessagesTypeAdapter`).

**Raisons.** On peut rejouer l'historique tel quel dans l'agent (`message_history`),
y compris les appels d'outils et leurs résultats, sans conversion.
Une table `message` séparée aurait demandé un mapping dans les deux sens.

**Conséquence.** Ce format est interne : l'API ne le renvoie pas.
`to_display_messages` (dans `models.py`) le transforme en une liste simple
`{role, content, created_at}` et masque le prompt système et les appels d'outils.
Le frontend ne dépend donc pas de PydanticAI.

## Prompt système sauvegardé en base

**Choix.** Le prompt (instructions + actualités du jour) est construit à la première
question d'une discussion et stocké dans `chat.system_prompt`. Il est ensuite
transmis à l'agent à chaque message via `deps`, et non écrit dans l'historique.

**Raisons.** Sans sauvegarde, les actualités changeraient d'un jour à l'autre
et une discussion reprise le lendemain n'aurait plus le même contexte.
Passer le prompt par `deps` évite aussi qu'un changement de `SYSTEM_PROMPT`
dans le code modifie silencieusement les anciennes discussions.

**Conséquences.**
- Les actualités sont dupliquées dans chaque discussion (choix simple, accepté).
- Si World News API est indisponible, la discussion utilise le prompt de base ;
  le chargement est retenté au message suivant, et le prompt n'est figé qu'une fois
  les actualités obtenues.
- On ne stocke que titre et résumé des articles (10 au maximum) pour garder le prompt court.

## Deux agents distincts

**Choix.** `news_agent` (chat, avec l'outil `search_news_tool`) et `review_agent`
(revue de presse, sans outil).

**Raisons.** Les tâches diffèrent : l'un converse et cherche, l'autre synthétise
un historique en un document structuré. Un agent spécialisé a un prompt plus court
et plus ciblé, et aucun risque d'appeler des outils inutilement.

## Outil de recherche d'articles

**Choix.** Un seul outil `search_news_tool(query, days)` appelle `/search-news`.

**Raisons.** L'API World News expose beaucoup de paramètres, mal adaptés à un LLM.
L'outil n'en expose que deux (mots-clés et ancienneté), fixe les autres
(langue, nombre de résultats, tri) et renvoie un texte court
`titre (date) : résumé [url]` au lieu du JSON brut. En cas d'échec de l'API,
il renvoie une phrase explicite plutôt qu'une exception, ce qui permet à l'agent
de répondre normalement.

## Revue de presse en sortie structurée

**Choix.** `review_agent` utilise `output_type=PressReview`
(titre, synthèse générale, liste d'articles `{title, summary, url}`),
et les champs sont écrits directement dans les colonnes `review_*` du chat.

**Raisons.** PydanticAI valide la sortie du LLM, donc pas d'analyse de texte libre
et un format garanti. Le schéma de sortie correspond aux données affichées.

**Conséquence.** Une seule revue par discussion (regénérer remplace l'ancienne).
Une table `review` dédiée serait nécessaire pour garder plusieurs versions.

## Fiabilité face au LLM

**Choix.** Deux mécanismes complémentaires.
1. `FallbackModel` : si le modèle principal (`LLM_MODEL`) renvoie une erreur HTTP,
   le modèle de secours (`LLM_FALLBACK_MODEL`) est essayé.
2. `with_retry` (dans `routes/chats.py`) : si les deux échouent avec 429, 500 ou 503,
   la requête est relancée avec une pause croissante, puis l'API répond 503
   avec un message en français.

**Raisons.** Les modèles Gemini gratuits renvoient souvent « high demand » (503)
ou des limites de débit (429). Les autres codes (401, 404, 400) ne se corrigent pas
en réessayant, ils sont donc remontés immédiatement.

## Authentification et autorisations

**Choix.**
- Mots de passe hachés avec bcrypt (stockés en `str`, pas en `bytes`).
- JWT signé (HS256) dont le champ `sub` est l'id utilisateur, durée de vie 12 h par défaut.
- `get_current_user` (dépendance FastAPI) est utilisée par toutes les routes de chat.
- `get_own_chat` vérifie la propriété : 404 si la discussion n'existe pas,
  403 si elle appartient à quelqu'un d'autre. Les revues passent par la même fonction,
  et `/reviews` filtre sur `user_id`.
- Message d'erreur unique pour un mauvais email ou un mauvais mot de passe,
  pour ne pas révéler quels emails existent.
- Le formulaire de connexion est en deux étapes (email puis mot de passe) :
  la première étape ne contacte pas le serveur, pour la même raison.

**Conséquence.** Les identifiants de discussion étant des entiers séquentiels,
c'est le contrôle de propriété, couvert par des tests, qui protège les données.

## Tests

**Choix.** pytest avec SQLite en mémoire, `TestModel` de PydanticAI à la place du LLM
(`news_agent.override`), `models.ALLOW_MODEL_REQUESTS = False`,
et fonctions factices pour `fetch_top_news` et `search_news`.

**Raisons.** Les tests sont rapides, déterministes, gratuits et fonctionnent en CI
sans secret. L'interdiction des requêtes réelles fait échouer un test qui
contournerait le faux LLM par erreur.

**Détail.** `conftest.py` définit les variables d'environnement avant tout import
de `src.*`, car `config.py` et `database.py` les lisent à l'import.

## Frontend

- **Next.js App Router, composants clients** pour les parties interactives.
  `AuthContext` expose `token`, `isLoading`, `login`, `logout` ; la page principale
  redirige vers `/login` quand l'utilisateur n'est pas authentifié.
- **Token dans `localStorage`** : choix le plus simple pour ce projet.
  Il est lisible par du JavaScript injecté (XSS). Un cookie `httpOnly` serait préférable
  en production.
- **Réponses de l'agent en texte brut** : le prompt demande de ne pas utiliser Markdown
  (listes avec des tirets simples), ce qui évite d'ajouter un moteur de rendu Markdown.
- **Dates** : le backend renvoie de l'UTC sans suffixe de fuseau ;
  `lib/format.ts` ajoute le `Z` avant de formater selon le fuseau du navigateur.

## Déploiement

**Choix.** Frontend sur Vercel (<https://p14-dev-ia.vercel.app>), backend et base
PostgreSQL sur Railway.

**Raisons.** Vercel est la plateforme native de Next.js (build et déploiement automatiques
à chaque `push`, sans configuration). Railway permet de déployer un service Python
et une base PostgreSQL côte à côte, avec les variables d'environnement gérées
dans l'interface, ce qui évite de versionner des secrets.

**Conséquences.** Le frontend et le backend sont sur deux origines différentes :
`CORS_ORIGINS` (backend) doit contenir l'URL Vercel et `NEXT_PUBLIC_API_URL` (frontend)
doit pointer vers l'URL Railway. Les clés API (Gemini, World News API) ne sont
stockées que dans les variables de Railway.

## Limites connues et pistes d'amélioration

- **Pas de migrations.** `create_all` ne modifie pas les tables existantes :
  les colonnes ajoutées après coup (`system_prompt`, `review_*`) ont été créées
  avec `ALTER TABLE`. Alembic serait la bonne solution.
- **Utilisateur de développement** (`test@test.com`) créé au démarrage par `init_db`,
  à supprimer en production. Il n'y a pas d'inscription ni de gestion de comptes.
- **Pas de suppression** de discussions ni de pagination des listes.
- **Revue de presse non testée automatiquement** : ses routes, les erreurs 400/403
  et l'isolation entre utilisateurs de `/reviews` mériteraient des tests,
  par exemple avec `TestModel(custom_output_args=...)`.
- **Limites des API externes.** Les offres gratuites de Gemini et de World News API
  sont limitées ; un appel d'outil multiplie le nombre de requêtes par message.
- **Origines CORS** limitées à `http://localhost:3000` par défaut : à configurer
  via `CORS_ORIGINS` pour un déploiement.
