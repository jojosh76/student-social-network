# StudNet API Documentation

Base URL locally: `http://localhost:3100/api`

Authenticated routes require `Authorization: Bearer <token>`.

## Auth

- `POST /auth/register`
  Body: `firstName`, `lastName`, `academicInfo.major`, `academicInfo.year`, `credentials.email`, `credentials.password`
- `POST /auth/login`
  Body: `email`, `password`
- `GET /auth/me`
- `POST /auth/logout`

## Users

- `GET /users/me`
- `GET /users`
- `GET /users/online`
- `GET /users/friends`
- `POST /users/:id/follow`
- `PATCH /users/me`
  Body: `bio`, `major`, `academicYear`
- `PATCH /users/update-avatar`
  Body: `avatarUrl`

## Posts

- `GET /posts`
- `GET /posts/me`
- `POST /posts`
  Body: `content`, `type`, `imageUrl`
- `POST /posts/:id/like`
- `GET /posts/:id/comments`
- `POST /posts/:id/comments`
  Body: `content`

## Events

- `GET /events`
- `GET /events?category=evenement`
- `GET /events/upcoming`
- `POST /events`
  Body: `title`, `description`, `category`, `location`, `startsAt`
- `POST /events/:id/join`

## Notifications

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `DELETE /notifications/:id`

## Search

- `GET /search?q=<term>&type=all`
- Supported `type`: `all`, `user`, `post`, `event`

## Conversations

- `GET /conversations`
- `POST /conversations`
  Body for group: `title`, `participantIds`
  Body for direct chat: `participantId`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`
  Body: `text`, `imageUrl`, `audioUrl`

## Files

- `POST /upload`
  Multipart field: `file`

## WebSocket

Gateway path: `/chat`

Client auth:

```js
io('http://localhost:3100', {
  path: '/chat',
  auth: { token: '<jwt>' }
});
```

Event sent by client: `send_message`

Payload: `conversationId`, `text`, `imageUrl`, `audioUrl`

Event received by client: `new_message`
