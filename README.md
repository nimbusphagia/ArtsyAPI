# Knick Knacks

Knick Knacks is a social platform made for artists to reclaim their space on the internet.

### Why

Short form content and advertiser-first politics have quickly taken over most online spaces. In particular, creative spaces. To remain visible, creators are pushed out of doing what they love and forced to chase trends.

Knick Knacks is built for creative people who just want to share their work and be seen for it.

### Creators first

Creators are our most important asset, that's why profiles are our most important feature. A profile doesn't need to be serious, but they are yours to build with care. 

Every post, collection and repost adds to that image. Let yourself be seen by what you make,and the community you surround yourself with.

### The Algorithm

There are two main feeds: Home and Explore. 

- **Home** is a classic timeline of everything you follow.

- **Explore**  is driven by what your circle is engaging with. If several people you follow like or comment on the same piece, it rises to the top. 

## Tech Stack

- **Express** + **TypeScript** — REST API
- **PostgreSQL** + **Prisma** — data layer
- **Zod** — request validation
- **Passport** (JWT + Google OAuth) — authentication
- **Cloudinary** — media storage for images and video
- **Socket.IO** — real-time layer for notifications and chat
- **Vitest** + **Supertest** — testing

## API Reference

Full endpoint reference: [`openapi.yaml`](./openapi.yaml)

A few of the main endpoints to get oriented:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new account |
| POST | `/auth/login` | Log in |
| POST | `/profiles` | Create a profile (first-time setup) |
| POST | `/profiles/:profileId/follow` | Follow someone|
| POST | `/posts` | Create a post |
| POST | `/collections` | Create a collection |
| GET | `/feed/home` | Chronological feed from people you follow |
| GET | `/feed/explore` | Ranked feed by shared interests with people you follow |

Everything else — comments, likes, reposts, collection management, notifications, chats — follows the same REST conventions and is documented in the spec above.

## Real-Time Layer

- Socket.IO lives alongside the REST API to push live updates for notifications and chats. 

- REST stays the source of truth — a fresh `GET` always reflects current state

- Sockets are just there to deliver updates while a client is connected, so nothing needs to be polled for or replayed after a reconnect.

- Every connected socket joins its own `profile:{id}` room, used for notifications and being told a new chat was started. It also joins a `chat:{id}` room for every chat it's a member of — including a brand-new one the moment it's created, so a live connection never has to reconnect to start getting messages in it.

**Events**

| Event | Room | When |
|-------|------|------|
| `notification:new` | `profile:{id}` | A single-recipient notification is created (a like, a comment, a repost, a follow) |
| `notification:new:lite` | `profile:{id}` | A follower notification fans out (a new post or collection from someone you follow) |
| `chat:new` | `profile:{id}` | Someone starts a new chat with you |
| `message:new` | `chat:{id}` | A message or reply is sent |
| `message:delete:lite` | `chat:{id}` | A message is deactivated |

## Testing

The test suite uses Vitest and Supertest against a real PostgreSQL database (a dedicated test database, isolated from development data). Tests run inside the API's Docker container:

```bash
npm run test:integration
```
