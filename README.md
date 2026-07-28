# ArtsyAPI

ArtsyAPI is a backend service for a social platform centered around sharing visual art. Users authenticate via Google OAuth or email/password, build a profile, publish posts made up of image/media slides, and organize their work (or others') into collections. The API also supports likes, comments, reposts, and following/blocking between profiles.

Below is a reference of all available endpoints, grouped by resource.

---

## Auth — `/`

| Method | Path | Description |
|---|---|---|
| GET | `/google` | Start Google OAuth flow |
| GET | `/google/callback` | Google OAuth callback |
| POST | `/refresh` | Refresh access token |
| POST | `/register` | Register a new account |
| POST | `/login` | Log in |
| PATCH | `/account` | Edit account (auth required) |

---

## Profiles — `/profiles`

All routes require authentication.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List profiles |
| GET | `/reposts` | List current user's reposts |
| GET | `/collections` | List current user's collections |
| POST | `/` | Create profile (first-time setup, accepts profile picture/banner) |
| GET | `/me` | Get current user's profile |
| PATCH | `/me` | Edit current user's profile (accepts profile picture/banner) |
| GET | `/:profileId` | Get a profile by id |
| GET | `/:profileId/posts` | List a profile's public posts |
| GET | `/:profileId/collections` | List a profile's collections |

---

## Posts — `/posts`

All routes require authentication.

| Method | Path | Description |
|---|---|---|
| POST | `/` | Create a post (accepts slide files) |
| GET | `/` | List current user's posts |
| GET | `/:postId` | Get a public post |
| PATCH | `/:postId` | Edit a post |
| DELETE | `/:postId` | Delete a post |
| POST | `/:postId/reposts` | Repost a post |
| DELETE | `/:postId/reposts` | Remove a repost |
| GET | `/:postId/comments` | List comments on a post |
| POST | `/:postId/comments` | Comment on a post |
| DELETE | `/comments/:commentId` | Remove a comment |
| GET | `/:postId/likes` | List likes on a post |
| POST | `/:postId/likes` | Like a post |
| DELETE | `/:postId/likes` | Remove a like |

---

## Collections — `/collections`

All routes require authentication. This resource is still in progress.

| Method | Path | Description |
|---|---|---|
| POST | `/` | Create a collection |
| GET | `/:collectionId` | Get a collection |
| PATCH | `/:collectionId` | Edit collection info |
| PUT | `/:collectionId` | Reorder posts in a collection |
| DELETE | `/:collectionId` | Delete a collection |
| POST | `/:collectionId/posts` | Add a post to a collection |
| DELETE | `/:collectionId/posts` | Remove a post from a collection |
