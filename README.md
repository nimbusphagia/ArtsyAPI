# Knick Knacks

KnickKnacks is a social platform made for artists to reclaim their space on the internet.

Among other things, short form content and advertiser-first politics have quickly taken over most spaces that once belonged to the people. In particular, artists of all sorts. We have been pushed out of doing what we love, forced to embrace the trend-seeking algorithm in order to gain any visibility. KnickKnacks aims to be a solution to that. 

We want to focus on creative people who just want to share something with the world, and give them a place where they are seen. And hopefully, create a community around that.  Knick Knacks is a creator-first platform for anyone who enjoys the craft as well as the whimsy of making art.

## Creators first

Creators are our most important asset, that's why profiles are our most important feature. KnickKnacks allow you to put out a curated image of yourself. And while a profile don't need to be serious, they are your online representation, take care in building it. 
Every post, collection and repost will make up your image. Embrace it, and let yourself be seen by the things you put out as well as the community you surround yourself with.

## The Algorithm

There are two main feeds: Home and Explore. The first one is a classic timeline with everything the people you follow is putting out. While the Explore feed is centered around what they are interacting with. The algorithm looks for what has the most attention from your circle, nothing more. If several people you follow like the same piece, that's what rises to the top.

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
