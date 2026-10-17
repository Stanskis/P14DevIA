# Regard critique et pistes d'amélioration

Ce document évalue la solution actuelle sur la **fluidité des interactions** et la
**fiabilité** de l'application. Deux pistes sont retenues. Pour chacune : une métrique ou un
exemple observé, une suggestion d'implémentation réalisable et un objectif mesurable.

| #   | Piste                                                           | Axe         | Statut      |
| --- | --------------------------------------------------------------- | ----------- | ----------- |
| 1   | Réduire le temps d'attente quand le service LLM est surchargé   | performance | implémentée |
| 2   | Remplacer `localStorage` par un cookie `httpOnly` pour le token | sécurité    | proposée    |

## Mesures disponibles

| Observation                                              | Source                             | Valeur                               |
| -------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| Message en échec (Gemini répond 503 trois fois)          | logs backend                       | ≈ 17 s avant l'affichage de l'erreur |
| Même scénario, autre essai                               | logs backend                       | ≈ 11 s                               |
| Pauses volontaires entre tentatives (avant modification) | code de `with_retry`               | 2 s + 4 s = 6 s                      |
| Durée d'un appel rejeté par Google                       | déduit des deux lignes précédentes | ≈ 2 à 4 s chacun                     |
| Latence d'un message réussi                              | —                                  | **non mesurée**                      |

---

## Piste 1 : réduire le temps d'attente quand le service LLM est surchargé

**Statut : implémentée.**

### Constat

Les erreurs du fournisseur de LLM ont été fréquentes pendant le développement : 503
« high demand » sur plusieurs modèles Gemini, 404 quand un modèle a été retiré pour les nouveaux
comptes, 429 dès le premier appel avec Mistral. Le mécanisme initial (modèle de secours puis
trois tentatives avec pauses) tenait **11 à 17 s** avant d'afficher une erreur
(voir le tableau des mesures), sans aucun retour intermédiaire, alors que l'utilisateur ne voit
que « L'assistant réfléchit… ».

Un défaut supplémentaire a été constaté : à l'envoi, le champ de saisie est vidé et le message
est affiché de façon optimiste. En cas d'échec, la base est restaurée (`ROLLBACK`), donc le
message disparaît au rechargement et **le texte saisi par l'utilisateur est perdu**.

### Implémentation

- **Budget de temps** : `asyncio.timeout(LLM_TIMEOUT_SECONDS)` autour de l'appel à l'agent dans
  `send_message` (variable d'environnement, 15 s par défaut). Au-delà, l'API répond 503.
- **Pauses de reprise raccourcies** : 1 s puis 2 s (au lieu de 2 s puis 4 s), constante
  `RETRY_PAUSE_SECONDS`.
- **Modèle de secours** : `FallbackModel(LLM_MODEL, LLM_FALLBACK_MODEL)`. Un modèle d'un autre
  fournisseur est préférable (par exemple Groq) : deux modèles du même fournisseur tombent
  souvent ensemble.
- **Correction d'un défaut identifié en relisant le code** : quand les deux modèles du
  `FallbackModel` échouent, PydanticAI lève un groupe d'exceptions et non un `ModelHTTPError`.
  L'ancien `except ModelHTTPError` ne l'attrapait pas, ce qui aurait donné une erreur 500 au lieu
  du 503 prévu. `is_retryable` examine maintenant aussi les groupes d'exceptions.
- **Journal par message** : durée, nombre d'appels au LLM et modèle effectivement utilisé
  (principal ou secours).
- **Frontend** : en cas d'erreur, le message optimiste est retiré et le texte est rendu au champ
  de saisie (`useChatMessages.send` renvoie `true` ou `false`, `MessageInput` restaure le texte).
- **Tests** (`tests/test_llm_errors.py`) : réponse via le modèle de secours en moins de 1 s ;
  503 en moins de 8 s quand tous les modèles échouent ; 503 quand le budget de temps est dépassé ;
  aucun message enregistré après un échec.

Un message qui déclenche l'outil de recherche fait au moins deux appels au LLM et peut durer plus
de 8 s légitimement : `LLM_TIMEOUT_SECONDS` se règle d'après la mesure de référence ci-dessous.

### Objectif mesurable

| Indicateur                                                       | Avant             | Cible                              | Après                                                           |
| ---------------------------------------------------------------- | ----------------- | ---------------------------------- | --------------------------------------------------------------- |
| Délai avant l'affichage d'une erreur (tous les modèles en échec) | 11-17 s (observé) | ≤ 15 s (d’après le benchmark)      | 3 s en test (pauses 1 s + 2 s, appels simulés)                  |
| Texte saisi perdu après une erreur                               | oui               | 0                                  | vérifié manuellement                                            |
| Réponse obtenue malgré une panne simulée du modèle principal     | non testé         | < 1 s via le modèle de secours     | testé par `pytest`(< 1 s); en réel : 1,03 s avec Gemini         |
| Bascule vers le modèle de secours(ancien test)                   | non journalisée   | visible dans le journal (`model=`) | chat_id=2 duration=1.03s requests=1 model=gemini-3.1-flash-lite |
| Messages servis malgré une panne du modèle principal             | 0 erreur affichée | reposne via le modèle e secours    | model=openai/gpt-oss-120b duration=1.64                         |

### Mesure de référence

Script à lancer contre le backend local (avec le vrai LLM) pour connaître la latence réelle
d'un message et régler le budget de temps :

```python
# backend/scripts/benchmark_message.py
```

Lancer : `cd backend && uv run python scripts/benchmark_message.py` (espacer les essais en cas
de 429). Si la médiane des messages avec outil dépasse 5 s, augmenter `LLM_TIMEOUT_SECONDS`.

### Résultats

Benchmark sur 10 messages par série (5 discussions × 2 questions), contre le backend local
avec le vrai LLM.

| Série | `LLM_TIMEOUT_SECONDS` | Réponses  | Erreurs                | Médiane     | Max (réponses réussies) |
| ----- | --------------------- | --------- | ---------------------- | ----------- | ----------------------- |
| 1     | 8 s                   | 9 sur 10  | 1 (503, délai dépassé) | non relevée | 7,8 s                   |
| 2     | 15 s                  | 10 sur 10 | 0                      | 2,7 s       | 9,4 s                   |

**Décision.** Sur les deux séries (20 messages), au moins deux réponses légitimes dépassent 8 s :
une a été coupée par le budget de la série 1, une autre a duré 9,4 s dans la série 2.
Le budget initial de 8 s était donc trop juste. Il a été relevé à **15 s** : on accepte une
attente d'erreur plus longue pour ne pas refuser de réponses valides.

**Limites de la mesure.** L'échantillon est petit (10 messages par série) car chaque essai
consomme du quota des API gratuites ; la médiane et le maximum sont donc indicatifs, et le
95e centile n'est pas calculé. La latence dépend aussi du modèle et de la charge du fournisseur
au moment du test. Une mesure plus large est à refaire avec la journalisation (`model=`,
`duration=`) sur plusieurs jours.

---

## Piste 2 : remplacer `localStorage` par un cookie `httpOnly` pour le token

**Statut : proposée.** (Piste de sécurité, complémentaire à la piste de performance.)

### Constat

Le token JWT est écrit dans `localStorage` par `AuthContext` et relu par `fetchWithAuth`.
Tout code JavaScript exécuté dans la page peut le lire : une faille XSS ou une dépendance npm
compromise suffit à le voler, et il reste valable 12 h (`ACCESS_TOKEN_EXPIRE_MINUTES = 720`).

**Exemple reproductible en une ligne** : dans la console du navigateur, sur le site déployé,
`localStorage.getItem('token')` retourne le token complet.

### Implémentation

1. **Backend** : `/login` dépose le token dans un cookie
   `response.set_cookie("access_token", token, httponly=True, secure=True, samesite="lax", max_age=43200)`(12h).
   `get_current_user` lit d'abord `request.cookies["access_token"]`, puis l'en-tête `Bearer`
   (conservé pour Swagger et les tests). Ajouter `POST /logout` qui supprime le cookie
   et `GET /me` pour que le frontend sache si la session est valide.
2. **Domaines différents** : le frontend (`vercel.app`) et l'API (`railway.app`) sont sur des
   sites distincts, et plusieurs navigateurs bloquent les cookies tiers. Solution : faire passer
   l'API par Vercel avec une réécriture dans `next.config` (`/api/:path*` vers l'URL Railway),
   puis `NEXT_PUBLIC_API_URL=/api`. Le cookie devient « first-party » et `SameSite=Lax` suffit.
3. **Frontend** : retirer tout accès à `localStorage` dans `AuthContext` et `fetchWithAuth`,
   ajouter `credentials: 'include'`, déterminer `isAuthenticated` avec `GET /me`,
   et appeler `POST /logout` à la déconnexion.
4. **CSRF** : avec `SameSite=Lax`, des requêtes `POST` en JSON et des origines CORS explicites,
   le risque est faible ; exiger un en-tête personnalisé si l'on veut une protection explicite.

### Objectif mesurable

| Vérification                                                                          | Cible                     |
| ------------------------------------------------------------------------------------- | ------------------------- |
| `localStorage.getItem('token')` dans la console                                       | `null`                    |
| Cookie `access_token` visible via `document.cookie`                                   | non (attribut `HttpOnly`) |
| Test `pytest` : `/login` renvoie `Set-Cookie` avec `HttpOnly`, `Secure` et `SameSite` | passe                     |
| Test `pytest` : une route protégée accepte le cookie ; `/logout` supprime le cookie   | passe                     |
| Connexion fonctionnelle sur Chrome et Safari avec le site déployé                     | oui                       |

---

## Piste écartée pour l'instant : streaming des réponses

Afficher la réponse au fil de sa génération (`agent.run_stream` côté FastAPI avec un flux
Server-Sent Events, lecture de `response.body` côté frontend) améliorerait la perception
de la vitesse, mais demande de repenser la sauvegarde de l'historique et la gestion des
erreurs en cours de flux. Elle n'est pas retenue ici au profit de la piste 1, plus simple
et qui traite le problème réellement observé.

## Suivre l'évolution

Pour comparer « avant » et « après », enregistrer pour chaque message : durée totale, nombre
d'appels au LLM, modèle utilisé et code d'erreur éventuel (journal applicatif au minimum ;
Logfire, déjà présent dans l'environnement, ou MLflow permettent d'obtenir ces traces
sans code supplémentaire important).
