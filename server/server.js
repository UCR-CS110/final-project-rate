const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const connectDB = require("./db");
const Professor = require("./professor");
const Review = require("./models/Review");
const User = require("./models/User");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const ALLOWED_CLIENT_ORIGINS = new Set([
  CLIENT_ORIGIN,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const LOCAL_CLIENT_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_CLIENT_ORIGINS.has(origin) || LOCAL_CLIENT_ORIGIN.test(origin)) {
        return callback(null, true);
      }

      console.error(`Rejected CORS origin: ${origin}`);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  })
);

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
  };
}

app.post("/signup", async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "That username is already taken",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, passwordHash });

    req.session.userId = user._id.toString();

    return res.status(201).json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Signup failed", error);
    return res.status(500).json({
      success: false,
      message: "Signup failed",
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    req.session.userId = user._id.toString();

    return res.json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login failed", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }

    res.clearCookie("connect.sid");
    return res.json({ success: true });
  });
});

app.get("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
      });
    }

    return res.json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Fetching current user failed", error);
    return res.status(500).json({
      success: false,
      message: "Fetching current user failed",
    });
  }
});

async function checkAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Not logged in",
    });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function belongsToUser(item, user) {
  return item.authorId.equals(user._id);
}

function serializeReview(review, user) {
  return {
    ...review.toObject(),
    canEdit: Boolean(user && belongsToUser(review, user)),
    replies: review.replies.map((reply) => ({
      ...reply.toObject(),
      canEdit: Boolean(user && belongsToUser(reply, user)),
    })),
  };
}

function requiredText(text) {
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }

  return text.trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.get("/professors", async (req, res) => {
  try {
    const search = typeof req.query.search === "string"
      ? req.query.search.trim()
      : "";

    if (!search) {
      return res.json([]);
    }

    const professors = await Professor.find({
      name: { $regex: `^${escapeRegExp(search)}`, $options: "i" },
    })
      .sort({ name: 1 })
      .limit(20);

    return res.json(professors);
  } catch (error) {
    console.error("Searching professors failed", error);
    return res.status(500).json({
      success: false,
      message: "Searching professors failed",
    });
  }
});

app.get("/reviews", async (req, res) => {
  try {
    const filter = req.query.professorId
      ? { professorId: req.query.professorId }
      : {};
    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    const user = req.session.userId
      ? await User.findById(req.session.userId)
      : null;

    return res.json(reviews.map((review) => serializeReview(review, user)));
  } catch (error) {
    console.error("Fetching reviews failed", error);
    return res.status(500).json({
      success: false,
      message: "Fetching reviews failed",
    });
  }
});

app.post("/reviews", checkAuth, async (req, res) => {
  try {
    const professorId = requiredText(req.body.professorId);
    const text = requiredText(req.body.text);
    const rating = Number(req.body.rating);

    if (!professorId || !text || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Professor, review text, and a rating from 1 to 5 are required",
      });
    }

    const review = await Review.create({
      professorId,
      authorId: req.user._id,
      username: req.user.username,
      text,
      rating,
      replies: [],
    });

    return res.status(201).json(serializeReview(review, req.user));
  } catch (error) {
    console.error("Creating review failed", error);
    return res.status(500).json({
      success: false,
      message: "Creating review failed",
    });
  }
});

app.put("/reviews/:reviewId", checkAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (!belongsToUser(review, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own reviews",
      });
    }

    const text = requiredText(req.body.text);
    const rating = Number(req.body.rating);
    if (!text || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Review text and a rating from 1 to 5 are required",
      });
    }

    review.text = text;
    review.rating = rating;
    await review.save();
    return res.json(serializeReview(review, req.user));
  } catch (error) {
    console.error("Editing review failed", error);
    return res.status(500).json({
      success: false,
      message: "Editing review failed",
    });
  }
});

app.delete("/reviews/:reviewId", checkAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (!belongsToUser(review, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    await review.deleteOne();
    return res.json({ success: true });
  } catch (error) {
    console.error("Deleting review failed", error);
    return res.status(500).json({
      success: false,
      message: "Deleting review failed",
    });
  }
});

app.post("/reviews/:reviewId/replies", checkAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    const text = requiredText(req.body.text);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (!text) {
      return res.status(400).json({ success: false, message: "Reply text is required" });
    }

    review.replies.push({
      authorId: req.user._id,
      username: req.user.username,
      text,
    });
    await review.save();
    return res.status(201).json(serializeReview(review, req.user));
  } catch (error) {
    console.error("Creating reply failed", error);
    return res.status(500).json({ success: false, message: "Creating reply failed" });
  }
});

app.put("/reviews/:reviewId/replies/:replyId", checkAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    const reply = review?.replies.id(req.params.replyId);
    const text = requiredText(req.body.text);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Reply not found" });
    }

    if (!belongsToUser(reply, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own replies",
      });
    }

    if (!text) {
      return res.status(400).json({ success: false, message: "Reply text is required" });
    }

    reply.text = text;
    await review.save();
    return res.json(serializeReview(review, req.user));
  } catch (error) {
    console.error("Editing reply failed", error);
    return res.status(500).json({ success: false, message: "Editing reply failed" });
  }
});

app.delete("/reviews/:reviewId/replies/:replyId", checkAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    const reply = review?.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Reply not found" });
    }

    if (!belongsToUser(reply, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own replies",
      });
    }

    review.replies.pull(reply._id);
    await review.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("Deleting reply failed", error);
    return res.status(500).json({ success: false, message: "Deleting reply failed" });
  }
});

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
}

startServer();
