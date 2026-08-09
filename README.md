# Knick Knacks

Knick-Knacks is the backend for Knick Knack, a social platform made for artists to reclaim a space on the internet.

Popular platforms hyperfocus on short content: short-form videos, stories, explore feeds designed to grab your attention as quickly as possible. We want to focus on the creative people who have passionate ideas to share with the world. That's why every profile is treated as an artist's space, whether the user thinks of themselves as one or not. The goal is to give people a place where creativity is valued, where they can look up to an artist and eventually be drawn into the silly little journey that is making art.

## Creators first

On most platforms, the thing you post is the thing that matters — the feed cares about the photo, the video, the caption. Here, it's the other way around. Following, blocking, browsing, all of it centers on people, not on any single thing they made. A profile is a whole space, and what someone shares is just a part of that space, not the point of it. You're not scrolling a wall of disconnected content; you're visiting artists.

## The Algorithm

**Home** is simple: a chronological stream of what the people you follow have been sharing or curating, newest first. Nothing ranked, nothing hidden.

**Explore**  Instead of focusing on the most likes overall, the algorithm looks at your network's tendencied. If several people you follow all liked the same piece, that's a stronger signal than a thousand strangers liking something else, that's what rises to the top.  

## Tech Stack

- **Express** + **TypeScript** — REST API
- **PostgreSQL** + **Prisma** — data layer
- **Zod** — request validation
- **Passport** (JWT + Google OAuth) — authentication
- **Cloudinary** — media storage for images and video
- **Socket.IO** — real-time layer for notifications and chat

## API Reference

Full endpoint reference: [`openapi.yaml`](./openapi.yaml)

A few of the main endpoints to get oriented:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new account |
| POST | `/auth/login` | Log in |
| POST | `/profiles` | Create a profile (first-time setup) |
| POST | `/profiles/:profileId/follow` | Follow a profile |
| POST | `/posts` | Create a post (accepts positioned slide files) |
| POST | `/collections` | Create a collection |
| GET | `/feed/home` | Chronological feed from profiles you follow |
| GET | `/feed/explore` | Ranked feed by shared interests with people you follow |

Everything else — comments, likes, reposts, collection management, notifications, chats — follows the same REST conventions and is documented in the spec above.

## Real-Time Layer

Socket.IO sits alongside the REST API to push live updates for notifications and chats. REST stays the source of truth — a fresh `GET` always reflects current state — sockets are just there to deliver updates while a client is connected, so nothing needs to be polled for or replayed after a reconnect.

Every connected socket joins its own `profile:{id}` room, used for notifications and being told a new chat was started. It also joins a `chat:{id}` room for every chat it's a member of — including a brand-new one the moment it's created, so a live connection never has to reconnect to start getting messages in it.

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
