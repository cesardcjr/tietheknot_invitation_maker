# TieTheKnot Invitation Studio

A separate React/Vite invitation maker connected to the TieTheKnot Express API, guest organizer, RSVP records, and seating assignments.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and update the URLs if needed.
3. Configure the backend by following [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md).
4. Start the backend on port 5000, the planner on port 5173, and this app with `npm run dev` on port 5174.

## Application areas

- `/` provides the authenticated invitation builder and guest-link manager.
- `/i/:token` provides the private guest invitation, RSVP, and released table lookup.

The invitation frontend does not maintain a second guest list. Every invitation references the stable ID of a guest stored by the wedding planner.
