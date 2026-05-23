const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const connectDB = require("./db");
const User = require("./models/User");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

connectDB();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
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
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
