const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const connectDB = require("./db");
const Professor = require("./professor");
const Review = require("./models/Review");
const User = require("./models/User");

dotenv.config();

const passport = require("./config/passport");

const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const ALLOWED_CLIENT_ORIGINS = new Set([
  CLIENT_ORIGIN,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const LOCAL_CLIENT_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

function isAllowedClientOrigin(origin) {
  return ALLOWED_CLIENT_ORIGINS.has(origin) || LOCAL_CLIENT_ORIGIN.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedClientOrigin(origin)) {
        return callback(null, true);
      }

      console.error(`Rejected CORS origin: ${origin}`);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

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
app.use(passport.initialize());

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    profilePicture: user.profilePicture,
    major: user.major,
    year: user.year,
    helpfulScore: user.helpfulScore,
  };
}

app.post("/signup", authLimiter, async (req, res) => {
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

app.post("/login", authLimiter, async (req, res) => {
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
    if (!user || !user.passwordHash) {
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

app.get("/auth/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Google auth is not configured",
    });
  }

  const origin = typeof req.query.origin === "string" && isAllowedClientOrigin(req.query.origin)
    ? req.query.origin
    : CLIENT_ORIGIN;

  req.session.googleRedirectOrigin = origin;
  return passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${CLIENT_ORIGIN}/login?error=google`,
    session: false,
  }),
  (req, res) => {
    req.session.userId = req.user._id.toString();
    const redirectOrigin = req.session.googleRedirectOrigin || CLIENT_ORIGIN;
    delete req.session.googleRedirectOrigin;
    return res.redirect(`${redirectOrigin}/search`);
  }
);

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

function canModerate(user) {
  return user?.role === "admin";
}

function canManageProfessor(professor, user) {
  return canModerate(user) || (
    professor.claimStatus === "approved" &&
    professor.claimedBy?.toString() === user?._id.toString()
  );
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to do that",
      });
    }

    return next();
  };
}

function numberFromRating(value) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function readRatings(body) {
  const difficulty = numberFromRating(body.difficulty ?? body.rating);
  const quality = numberFromRating(body.quality ?? body.rating);
  const engagement = numberFromRating(body.engagement ?? body.rating);

  if (!difficulty || !quality || !engagement) {
    return null;
  }

  return {
    difficulty,
    quality,
    engagement,
    rating: Math.round(((difficulty + quality + engagement) / 3) * 10) / 10,
  };
}

function readTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function userVote(review, user) {
  if (!user) {
    return null;
  }

  const userId = user._id.toString();
  if (review.upvotes.some((id) => id.toString() === userId)) {
    return "up";
  }

  if (review.downvotes.some((id) => id.toString() === userId)) {
    return "down";
  }

  return null;
}

function serializeReview(review, user) {
  const reviewObject = review.toObject();
  const upvoteCount = review.upvotes?.length || 0;
  const downvoteCount = review.downvotes?.length || 0;

  return {
    ...reviewObject,
    difficulty: review.difficulty || review.rating,
    quality: review.quality || review.rating,
    engagement: review.engagement || review.rating,
    upvoteCount,
    downvoteCount,
    helpfulScore: upvoteCount - downvoteCount,
    userVote: userVote(review, user),
    canEdit: Boolean(user && (belongsToUser(review, user) || canModerate(user))),
    canModerate: Boolean(canModerate(user)),
    replies: review.replies.map((reply) => ({
      ...reply.toObject(),
      canEdit: Boolean(user && (belongsToUser(reply, user) || canModerate(user))),
    })),
  };
}

function activeReviewFilter(extraFilter = {}) {
  return {
    ...extraFilter,
    status: { $ne: "deleted" },
  };
}

function getReviewStats(reviews) {
  if (reviews.length === 0) {
    return {
      averageRating: null,
      averageDifficulty: null,
      averageQuality: null,
      averageEngagement: null,
      reviewCount: 0,
      topTags: [],
    };
  }

  const totals = reviews.reduce(
    (sum, review) => ({
      rating: sum.rating + review.rating,
      difficulty: sum.difficulty + (review.difficulty || review.rating),
      quality: sum.quality + (review.quality || review.rating),
      engagement: sum.engagement + (review.engagement || review.rating),
    }),
    { rating: 0, difficulty: 0, quality: 0, engagement: 0 }
  );
  const tagCounts = new Map();
  reviews.forEach((review) => {
    review.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return {
    averageRating: Number((totals.rating / reviews.length).toFixed(1)),
    averageDifficulty: Number((totals.difficulty / reviews.length).toFixed(1)),
    averageQuality: Number((totals.quality / reviews.length).toFixed(1)),
    averageEngagement: Number((totals.engagement / reviews.length).toFixed(1)),
    reviewCount: reviews.length,
    topTags: [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count })),
  };
}

async function professorWithStats(professor) {
  const reviews = await Review.find(activeReviewFilter({ professorId: professor._id.toString() }));
  return {
    ...professor.toObject(),
    stats: getReviewStats(reviews),
  };
}

async function refreshHelpfulScore(userId) {
  const reviews = await Review.find({ authorId: userId });
  const helpfulScore = reviews.reduce(
    (sum, review) => sum + (review.upvotes.length - review.downvotes.length),
    0
  );
  await User.findByIdAndUpdate(userId, { helpfulScore });
}

async function reviewsWithProfessors(userId, currentUser) {
  const reviews = await Review.find({ authorId: userId }).sort({ createdAt: -1 });
  const professorIds = [...new Set(reviews.map((review) => review.professorId))];
  const professors = await Professor.find({ _id: { $in: professorIds } });
  const professorById = new Map(
    professors.map((professor) => [professor._id.toString(), professor])
  );

  return reviews.map((review) => ({
    ...serializeReview(review, currentUser),
    professor: professorById.get(review.professorId) || null,
  }));
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

function adminUser(user) {
  return {
    ...publicUser(user),
    email: user.email,
    hasPassword: Boolean(user.passwordHash),
    googleLinked: Boolean(user.googleId),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function readAdminProfileUpdates(body) {
  const updates = {};

  if (typeof body.username === "string" && body.username.trim()) {
    updates.username = body.username.trim();
  }

  if (["student", "professor", "admin"].includes(body.role)) {
    updates.role = body.role;
  }

  if (typeof body.major === "string") {
    updates.major = body.major.trim();
  }

  if (typeof body.year === "string") {
    updates.year = body.year.trim();
  }

  return updates;
}

function readOwnProfileUpdates(body) {
  const updates = {};

  if (typeof body.username === "string" && body.username.trim()) {
    updates.username = body.username.trim();
  }

  if (typeof body.major === "string") {
    updates.major = body.major.trim();
  }

  if (typeof body.year === "string") {
    updates.year = body.year.trim();
  }

  return updates;
}

async function fetchTextWithRetry(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Rate-admin-professor-import/1.0" },
  });

  if (!response.ok) {
    throw new Error(`UCR request failed (${response.status})`);
  }

  return response.text();
}

async function fetchJsonWithRetry(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Rate-admin-professor-import/1.0" },
  });

  if (!response.ok) {
    throw new Error(`UCR request failed (${response.status})`);
  }

  return response.json();
}

function getProfileNetIds(sitemap) {
  const matches = sitemap.matchAll(
    /<loc>https:\/\/profiles\.ucr\.edu\/app\/home\/profile\/([^<]+)<\/loc>/g
  );

  return [...matches].map((match) => decodeURIComponent(match[1]));
}

function getCourses(courses) {
  return Array.isArray(courses)
    ? courses.filter((course) => typeof course === "string")
    : [];
}

app.get("/professors", async (req, res) => {
  try {
    const search = typeof req.query.search === "string"
      ? req.query.search.trim()
      : "";
    const department = typeof req.query.department === "string"
      ? req.query.department.trim()
      : "";
    const course = typeof req.query.course === "string"
      ? req.query.course.trim()
      : "";

    if (!search && !department && !course) {
      return res.json([]);
    }

    const filters = [];
    if (search) {
      const searchPattern = escapeRegExp(search);
      filters.push({
        $or: [
          { name: { $regex: searchPattern, $options: "i" } },
          { department: { $regex: searchPattern, $options: "i" } },
          { organization: { $regex: searchPattern, $options: "i" } },
          { title: { $regex: searchPattern, $options: "i" } },
          { courses: { $regex: searchPattern, $options: "i" } },
        ],
      });
    }
    if (department) {
      filters.push({ department: { $regex: escapeRegExp(department), $options: "i" } });
    }
    if (course) {
      filters.push({ courses: { $regex: escapeRegExp(course), $options: "i" } });
    }

    const professors = await Professor.find(filters.length ? { $and: filters } : {})
      .sort({ name: 1 })
      .limit(20);

    const enrichedProfessors = await Promise.all(
      professors.map((professor) => professorWithStats(professor))
    );

    return res.json(enrichedProfessors);
  } catch (error) {
    console.error("Searching professors failed", error);
    return res.status(500).json({
      success: false,
      message: "Searching professors failed",
    });
  }
});

app.get("/professors/:professorId", async (req, res) => {
  try {
    const professor = await Professor.findById(req.params.professorId);

    if (!professor) {
      return res.status(404).json({
        success: false,
        message: "Professor not found",
      });
    }

    return res.json(await professorWithStats(professor));
  } catch (error) {
    console.error("Fetching professor failed", error);
    return res.status(500).json({
      success: false,
      message: "Fetching professor failed",
    });
  }
});

app.get("/professors/:professorId/similar", async (req, res) => {
  try {
    const professor = await Professor.findById(req.params.professorId);

    if (!professor) {
      return res.status(404).json({
        success: false,
        message: "Professor not found",
      });
    }

    const filters = [{ _id: { $ne: professor._id } }];
    const matchers = [];
    if (professor.department) {
      matchers.push({ department: professor.department });
    }
    if (professor.courses.length > 0) {
      matchers.push({ courses: { $in: professor.courses } });
    }

    if (matchers.length === 0) {
      return res.json([]);
    }

    filters.push({ $or: matchers });
    const similar = await Professor.find({ $and: filters }).limit(12);
    const enriched = await Promise.all(similar.map((item) => professorWithStats(item)));

    return res.json(
      enriched
        .sort((a, b) => (b.stats.averageRating || 0) - (a.stats.averageRating || 0))
        .slice(0, 6)
    );
  } catch (error) {
    console.error("Fetching similar professors failed", error);
    return res.status(500).json({
      success: false,
      message: "Fetching similar professors failed",
    });
  }
});

app.post("/professors/:professorId/claim", checkAuth, async (req, res) => {
  try {
    const professor = await Professor.findById(req.params.professorId);
    if (!professor) {
      return res.status(404).json({ success: false, message: "Professor not found" });
    }

    if (professor.claimStatus === "approved") {
      return res.status(409).json({
        success: false,
        message: "This professor profile has already been claimed",
      });
    }

    professor.claimStatus = "pending";
    professor.claimRequestedBy = req.user._id;
    professor.claimNote = requiredText(req.body.note) || "";
    await professor.save();

    return res.status(201).json(await professorWithStats(professor));
  } catch (error) {
    console.error("Claiming professor failed", error);
    return res.status(500).json({ success: false, message: "Claim request failed" });
  }
});

app.get("/users/:userId/profile", async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.userId);

    if (!profileUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = req.session.userId
      ? await User.findById(req.session.userId)
      : null;

    return res.json({
      user: publicUser(profileUser),
      reviews: await reviewsWithProfessors(profileUser._id, currentUser),
    });
  } catch (error) {
    console.error("Fetching user profile failed", error);
    return res.status(500).json({
      success: false,
      message: "Fetching user profile failed",
    });
  }
});

app.get("/reviews", async (req, res) => {
  try {
    const filter = req.query.professorId
      ? { professorId: req.query.professorId }
      : {};
    const reviews = await Review.find(activeReviewFilter(filter)).sort({ createdAt: -1 });
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

app.get("/my-reviews", checkAuth, async (req, res) => {
  try {
    return res.json(await reviewsWithProfessors(req.user._id, req.user));
  } catch (error) {
    console.error("Fetching my reviews failed", error);
    return res.status(500).json({
      success: false,
      message: "Fetching my reviews failed",
    });
  }
});

app.patch("/me", checkAuth, async (req, res) => {
  try {
    const updates = readOwnProfileUpdates(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Username, major, or year is required",
      });
    }

    const oldUsername = req.user.username;
    Object.assign(req.user, updates);
    await req.user.save();

    if (updates.username && updates.username !== oldUsername) {
      await Review.updateMany(
        { authorId: req.user._id },
        { username: updates.username }
      );
      await Review.updateMany(
        { "replies.authorId": req.user._id },
        { $set: { "replies.$[reply].username": updates.username } },
        { arrayFilters: [{ "reply.authorId": req.user._id }] }
      );
    }

    return res.json({
      success: true,
      user: publicUser(req.user),
    });
  } catch (error) {
    console.error("Updating profile failed", error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }
    return res.status(500).json({
      success: false,
      message: "Updating profile failed",
    });
  }
});

app.post("/reviews", checkAuth, async (req, res) => {
  try {
    const professorId = requiredText(req.body.professorId);
    const text = requiredText(req.body.text);
    const ratings = readRatings(req.body);

    if (!professorId || !text || !ratings) {
      return res.status(400).json({
        success: false,
        message: "Professor, review text, and 1 to 5 ratings for difficulty, quality, and engagement are required",
      });
    }

    const professor = await Professor.findById(professorId);
    if (!professor) {
      return res.status(404).json({ success: false, message: "Professor not found" });
    }

    const review = await Review.create({
      professorId,
      authorId: req.user._id,
      username: req.user.username,
      text,
      ...ratings,
      tags: readTags(req.body.tags),
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
    const ratings = readRatings(req.body);
    if (!text || !ratings) {
      return res.status(400).json({
        success: false,
        message: "Review text and 1 to 5 ratings for difficulty, quality, and engagement are required",
      });
    }

    review.text = text;
    review.difficulty = ratings.difficulty;
    review.quality = ratings.quality;
    review.engagement = ratings.engagement;
    review.rating = ratings.rating;
    review.tags = readTags(req.body.tags);
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

    if (!belongsToUser(review, req.user) && !canModerate(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    review.status = "deleted";
    review.moderationReason = canModerate(req.user)
      ? requiredText(req.body?.reason) || "Deleted by admin"
      : "";
    await review.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("Deleting review failed", error);
    return res.status(500).json({
      success: false,
      message: "Deleting review failed",
    });
  }
});

app.post("/reviews/:reviewId/vote", checkAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review || review.status === "deleted") {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const vote = req.body.vote;
    if (!["up", "down", "none"].includes(vote)) {
      return res.status(400).json({ success: false, message: "Vote must be up, down, or none" });
    }

    const userId = req.user._id.toString();
    review.upvotes = review.upvotes.filter((id) => id.toString() !== userId);
    review.downvotes = review.downvotes.filter((id) => id.toString() !== userId);

    if (vote === "up") {
      review.upvotes.push(req.user._id);
    }
    if (vote === "down") {
      review.downvotes.push(req.user._id);
    }

    await review.save();
    await refreshHelpfulScore(review.authorId);
    return res.json(serializeReview(review, req.user));
  } catch (error) {
    console.error("Voting on review failed", error);
    return res.status(500).json({ success: false, message: "Voting on review failed" });
  }
});

app.post("/reviews/:reviewId/flag", checkAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review || review.status === "deleted") {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const userId = req.user._id.toString();
    if (!review.flaggedBy.some((id) => id.toString() === userId)) {
      review.flaggedBy.push(req.user._id);
    }
    review.status = "flagged";
    review.moderationReason = requiredText(req.body.reason) || "Flagged by user";
    await review.save();

    return res.json(serializeReview(review, req.user));
  } catch (error) {
    console.error("Flagging review failed", error);
    return res.status(500).json({ success: false, message: "Flagging review failed" });
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

app.get("/admin/users", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users.map(adminUser));
  } catch (error) {
    console.error("Fetching admin users failed", error);
    return res.status(500).json({ success: false, message: "Fetching users failed" });
  }
});

app.patch("/admin/users/:userId", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    const updates = readAdminProfileUpdates(req.body);

    if (req.params.userId === req.user._id.toString() && updates.role && updates.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin role",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json(adminUser(user));
  } catch (error) {
    console.error("Updating admin user failed", error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Username or email already exists" });
    }
    return res.status(500).json({ success: false, message: "Updating user failed" });
  }
});

app.put("/admin/users/:userId/password", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    const password = req.body.password;

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    return res.json({ success: true, user: adminUser(user) });
  } catch (error) {
    console.error("Changing user password failed", error);
    return res.status(500).json({ success: false, message: "Changing password failed" });
  }
});

app.delete("/admin/users/:userId", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await Review.updateMany(
      { authorId: user._id },
      { status: "deleted", moderationReason: "Author account deleted by admin" }
    );
    await Review.updateMany(
      { "replies.authorId": user._id },
      { $pull: { replies: { authorId: user._id } } }
    );
    await Professor.updateMany(
      { $or: [{ claimedBy: user._id }, { claimRequestedBy: user._id }] },
      {
        $set: {
          claimedBy: null,
          claimRequestedBy: null,
          claimStatus: "none",
          claimNote: "",
        },
      }
    );
    await user.deleteOne();

    return res.json({ success: true });
  } catch (error) {
    console.error("Deleting user failed", error);
    return res.status(500).json({ success: false, message: "Deleting user failed" });
  }
});

app.post("/admin/professors/repopulate", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.body.limit) || 100, 1), 500);
    const clearExisting = Boolean(req.body.clearExisting);
    const sitemap = await fetchTextWithRetry("https://profiles.ucr.edu/sitemap.xml");
    const netIds = getProfileNetIds(sitemap).slice(0, limit);

    if (clearExisting) {
      await Professor.deleteMany({});
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const netId of netIds) {
      try {
        const profile = await fetchJsonWithRetry(`https://profiles.ucr.edu/api/profile/${netId}`);

        if (profile.primaryAffiliation !== "Faculty" || !profile.name) {
          skipped += 1;
        } else {
          await Professor.updateOne(
            { netId: profile.netId },
            {
              $set: {
                netId: profile.netId,
                name: profile.name,
                department: profile.department || "",
                organization: profile.organization || "",
                title: profile.title || "",
                profileUrl: `https://profiles.ucr.edu/app/home/profile/${profile.netId}`,
                courses: getCourses(profile.courses),
              },
            },
            { upsert: true }
          );
          imported += 1;
        }
      } catch (error) {
        failed += 1;
      }
    }

    return res.json({
      success: true,
      scanned: netIds.length,
      imported,
      skipped,
      failed,
      professorCount: await Professor.countDocuments(),
    });
  } catch (error) {
    console.error("Repopulating professors failed", error);
    return res.status(500).json({
      success: false,
      message: "Repopulating professors failed",
    });
  }
});

app.get("/admin/moderation", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    const flaggedReviews = await Review.find({ status: "flagged" }).sort({ updatedAt: -1 });
    const claimRequests = await Professor.find({ claimStatus: "pending" }).sort({ updatedAt: -1 });
    const requesterIds = claimRequests
      .map((professor) => professor.claimRequestedBy)
      .filter(Boolean);
    const requesters = await User.find({ _id: { $in: requesterIds } });
    const requesterById = new Map(
      requesters.map((user) => [user._id.toString(), publicUser(user)])
    );

    return res.json({
      flaggedReviews: flaggedReviews.map((review) => serializeReview(review, req.user)),
      claimRequests: claimRequests.map((professor) => ({
        ...professor.toObject(),
        requestedBy: professor.claimRequestedBy
          ? requesterById.get(professor.claimRequestedBy.toString()) || null
          : null,
      })),
    });
  } catch (error) {
    console.error("Fetching admin moderation queue failed", error);
    return res.status(500).json({
      success: false,
      message: "Fetching admin moderation queue failed",
    });
  }
});

app.post("/admin/reviews/:reviewId/status", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const status = req.body.status;
    if (!["active", "deleted"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or deleted" });
    }

    review.status = status;
    review.moderationReason = requiredText(req.body.reason) || "";
    if (status === "active") {
      review.flaggedBy = [];
    }
    await review.save();

    return res.json(serializeReview(review, req.user));
  } catch (error) {
    console.error("Updating review status failed", error);
    return res.status(500).json({ success: false, message: "Updating review status failed" });
  }
});

app.post("/admin/professors/:professorId/claim", checkAuth, requireRole("admin"), async (req, res) => {
  try {
    const professor = await Professor.findById(req.params.professorId);
    if (!professor) {
      return res.status(404).json({ success: false, message: "Professor not found" });
    }

    const status = req.body.status;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be approved or rejected" });
    }

    professor.claimStatus = status;
    if (status === "approved") {
      professor.claimedBy = professor.claimRequestedBy;
      if (professor.claimRequestedBy) {
        await User.findByIdAndUpdate(professor.claimRequestedBy, { role: "professor" });
      }
    } else {
      professor.claimedBy = null;
    }
    await professor.save();

    return res.json(await professorWithStats(professor));
  } catch (error) {
    console.error("Updating professor claim failed", error);
    return res.status(500).json({ success: false, message: "Updating professor claim failed" });
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
