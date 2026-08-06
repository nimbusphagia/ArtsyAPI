# ArtsyAPI

ArtsyAPI is the backend for a social platform built around artists, not around art as disposable content.

Most platforms optimize for volume: endless feeds, quick scrolling, images stripped of the person who made them. ArtsyAPI is built on the opposite bet. Every post belongs to a profile, and every profile is treated as an artist's space, whether the person behind it thinks of themselves as one yet or not. The goal is to give that space room to breathe, and to give the people who follow it a reason to follow the artist, not just the algorithm.

A few ideas that shape how the API is designed:

- **Profiles are the unit of identity, not posts.** Following, blocking, and browsing all center on profiles. A post is something an artist made; it isn't a free-floating unit of content divorced from who's behind it.
- **Collections let people curate, not just hoard.** A collection can hold posts from any artist, not only your own, so someone can build a gallery around a theme, an inspiration, or a specific artist's body of work. Curation is a form of appreciation the platform actively supports.
- **Depth over reach.** There's no algorithmic feed here to reward whatever spreads fastest. The system is built to support dedicated followers who chose to follow a specific artist, not passive scrolling through a nameless stream.
- **Blocking is a real boundary, not a filter.** Blocking someone doesn't just hide their content; it unwinds any existing follow relationship between the two profiles, and neither side can act on the other afterward, even in ways unrelated to visibility.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Profiles](#profiles)
    - [Your Profile](#your-profile)
    - [Any Profile](#any-profile)
    - [Follow & Block](#follow--block)
  - [Posts](#posts)
    - [Posts CRUD](#posts-crud)
    - [Comments](#comments)
    - [Likes](#likes)
    - [Reposts](#reposts)
  - [Collections](#collections)
    - [Collections CRUD](#collections-crud)
    - [Collection Posts](#collection-posts)
    - [Collection Likes](#collection-likes)
  - [Chats](#chats)
- [Testing](#testing)

## Tech Stack

- **Express** + **TypeScript** — REST API
- **PostgreSQL** + **Prisma** — data layer
- **Zod** — request validation
- **Passport** (JWT + Google OAuth) — authentication
- **Cloudinary** — media storage for images and video
- **Socket.IO** — real-time layer (configured, not yet wired into chat behavior)

## Core Concepts

**User vs. Profile.** `User` is the private, authentication-only record. `Profile` is the public identity everything social hangs off of. A `User` can briefly exist without a `Profile`, between registering and completing onboarding.

**Posts are slide decks.** A post is an ordered sequence of image or video slides, explicitly positioned by the client, not a single image. Posts can be private, and carry their own comments, likes, and reposts.

**Collections cross authorship.** A collection can combine public posts from any artist the curator isn't blocked by, meant for building a gallery around a theme rather than just organizing your own drafts.

**Privacy is enforced per-endpoint.** There's no single access-control gate; each endpoint checks privacy and blocking status on its own terms.

**Refresh tokens rotate and detect reuse.** Access tokens are short-lived. If a refresh token is reused after already being rotated, its entire token family is revoked.

**Chats are intentionally minimal.** Direct messages only, supporting text and the sharing of posts or collections. No group chats, no extra surface area.

## API Reference

### Auth
Base path: `/auth`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/google` | Start Google OAuth flow |
| GET | `/google/callback` | Google OAuth callback |
| POST | `/register` | Register a new account |
| POST | `/login` | Log in |
| POST | `/refresh` | Rotate refresh token and issue a new access token |
| PATCH | `/account` | Edit the current account — auth required |

### Profiles
Base path: `/profiles` — all routes require authentication

#### Your Profile
Actions scoped to the authenticated user's own profile.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a profile (first-time setup; accepts a picture and banner) |
| GET | `/me` | Get the current user's profile |
| PATCH | `/me` | Edit the current user's profile |
| GET | `/posts` | List the current user's posts |
| GET | `/collections` | List the current user's collections |
| GET | `/reposts` | List the current user's reposts |
| GET | `/blocked` | List profiles the current user has blocked |

#### Any Profile
Reading any profile by id.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List profiles |
| GET | `/:profileId` | Get a profile by id |
| GET | `/:profileId/posts` | List a profile's public posts |
| GET | `/:profileId/collections` | List a profile's public collections |

#### Follow & Block

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:profileId/follow` | Follow a profile |
| DELETE | `/:profileId/follow` | Unfollow a profile |
| GET | `/:profileId/followers` | List a profile's followers |
| GET | `/:profileId/followed` | List profiles a given profile follows |
| POST | `/:profileId/block` | Block a profile |
| DELETE | `/:profileId/block` | Unblock a profile |

### Posts
Base path: `/posts` — all routes require authentication

#### Posts CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a post (accepts positioned slide files) |
| GET | `/:postId` | Get a public post |
| PATCH | `/:postId` | Edit a post |
| DELETE | `/:postId` | Delete a post |

#### Comments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:postId/comments` | List comments on a post |
| POST | `/:postId/comments` | Comment on a post |
| DELETE | `/comments/:commentId` | Remove a comment |
| POST | `/comments/:commentId/likes` | Like a comment |
| DELETE | `/comments/:commentId/likes` | Remove a like from a comment |

#### Likes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:postId/likes` | List likes on a post |
| POST | `/:postId/likes` | Like a post |
| DELETE | `/:postId/likes` | Remove a like from a post |

#### Reposts

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:postId/reposts` | Repost a post |
| DELETE | `/:postId/reposts` | Remove a repost |

### Collections
Base path: `/collections` — all routes require authentication

#### Collections CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a collection |
| GET | `/:collectionId` | Get a collection |
| PATCH | `/:collectionId` | Edit collection info |
| DELETE | `/:collectionId` | Delete a collection |

#### Collection Posts

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:collectionId/posts` | Add a post to a collection |
| DELETE | `/:collectionId/posts` | Remove a post from a collection |
| PUT | `/:collectionId` | Reorder posts within a collection |

#### Collection Likes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:collectionId/likes` | List likes on a collection |
| POST | `/:collectionId/likes` | Like a collection |
| DELETE | `/:collectionId/likes` | Remove a like from a collection |

### Chats
Base path: `/chats` — all routes require authentication. Direct messages only, supporting text and the sharing of posts or collections. Real-time delivery is not yet implemented.

## Testing

The test suite uses Vitest and Supertest against a real PostgreSQL database (a dedicated test database, isolated from development data). Tests run inside the API's Docker container:

```bash
npm run test:integration
```

Unit tests, where present, run directly on the host and don't require the database:

```bash
npm run test:unit
```
