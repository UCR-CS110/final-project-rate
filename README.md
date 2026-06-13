# Rate

Rate is a web-based platform for students to share and access information about professors and courses. The goal is to help students make better course selection decisions by showing professor information, course information, ratings, and peer reviews in one place.

## Team Members

- Tanner Watamura
- Leo Zhou
- William Chen

## Tools Used

- **Frontend:** React with Vite
- **Backend:** Node.js with Express.js
- **Database:** MongoDB Atlas
- **Database library:** Mongoose
- **Authentication/session support:** Express Session
- **Password security:** bcrypt
- **Environment variables:** dotenv
- **Frontend forms:** react-hook-form
- **Development tools:** npm, Git, GitHub

## Project Structure

```txt
final-project-rate/
  client(frontend)/   React frontend
  server/             Node/Express backend
```

## How To Run The Project

### 1. Clone the repository

```bash
git clone <repo-url>
cd final-project-rate
```

### 2. Install frontend dependencies

```bash
cd "client(frontend)"
npm install
```

### 3. Install backend dependencies

```bash
cd ../server
npm install
```

### 4. Create the backend `.env` file

Inside the `server` folder, create a `.env` file:

```env
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
PORT=8080
CLIENT_ORIGIN=http://localhost:3000
```

`MONGO_URI` is used to connect the backend to MongoDB. `SESSION_SECRET` is used to sign login sessions. The `PORT` value is optional because the backend defaults to `8080`. `CLIENT_ORIGIN` tells the backend which frontend URL is allowed to send requests.

### 5. Start the backend

From the `server` folder:

```bash
npm run dev
```

The backend should run at:

```txt
http://localhost:8080
```

### 6. Start the frontend

Open a second terminal and run:

```bash
cd "client(frontend)"
npm run dev
```

The frontend should run at:

```txt
http://localhost:3000
```

The admin page should run at:

```txt
http://localhost:3000/admin/
```

## Deployment Notes

For deployment, the frontend can be built with:

```bash
cd "client(frontend)"
npm run build
```

The backend needs a deployed Node.js environment with the same environment variables:

```env
MONGO_URI
SESSION_SECRET
PORT
CLIENT_ORIGIN
```

The frontend API URLs may need to be updated from `http://localhost:8080` to the deployed backend URL. The backend `CLIENT_ORIGIN` should also be updated to the deployed frontend URL.

## Working Sections

### Frontend

- Home page is set up with project branding and styling.
- Navbar is set up with links to main pages.
- Login page works as a form and asks for both username and password.
- Signup page exists and is connected through the `/signup` route.
- Login page links to signup with "Don't have an account? Sign up here".
- Search page route exists and is ready for future professor/course search work.
- Admin page exists at `/admin/` for the required admin entry point.

### Backend

- Express server is set up in `server.js`.
- MongoDB connection is set up in `db.js` using Mongoose and environment variables.
- User model is set up in `backend/models/User.js`.
- Professor model is set up in `backend/professor.js` with professor identity, department, title, profile URL, courses taught, and profile-claim status fields.
- Review model is set up in `backend/models/Review.js` with multi-metric ratings for difficulty, quality, and engagement.
- Reviews support text comments, tags, replies, upvotes/downvotes, helpful-score calculation, and moderation status fields.
- Professor search is connected to MongoDB and supports searching by professor name, department, title, organization, or course code.
- Professor detail data includes aggregate rating statistics and top tags calculated from reviews.
- Similar professor recommendations are available based on shared department or shared courses.
- UCR professor import support is available through `backend/scripts/import-ucr-professors.js`.
- Signup route creates users and hashes passwords with bcrypt.
- Login route checks username and password.
- Logout route exists on the backend.
- `/me` route checks the currently logged-in user.
- Sessions are configured with Express Session.
- CORS is configured so the frontend can send requests to the backend.

## Features Still In Progress

- Frontend logout button/action still needs to be added.
- Professor search can still be improved with more advanced ranking, filtering, and pagination.
- Review/rating data can still be improved with richer analytics and stricter validation rules.
- Professor profile pages still need to be built.
- Admin moderation features still need to be built.
- Google sign-in is planned but not implemented yet.
- Recommendation features have a first version based on shared department or courses, but can still be improved with better ranking logic.

## Original Project Goals

- Allow students to rate professors and courses.
- Support user accounts and roles such as student, professor, and admin.
- Store professor information such as name, department, and courses taught.
- Support multi-metric ratings such as difficulty, quality, and engagement.
- Allow students to search by professor, department, or course.
- Eventually support admin moderation and professor profile claiming.
