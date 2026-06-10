const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const User = require("../models/User");

function buildUniqueUsername(profile) {
  const email = profile.emails?.[0]?.value;
  const baseUsername = (email?.split("@")[0] || profile.displayName || `google-${profile.id}`)
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return `${baseUsername}-${profile.id.slice(-6)}`;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          let user = await User.findOne({ googleId: profile.id });

          if (!user && email) {
            user = await User.findOne({ email });
          }

          if (!user) {
            user = await User.create({
              googleId: profile.id,
              email,
              username: buildUniqueUsername(profile),
              profilePicture: profile.photos?.[0]?.value || "",
            });
          } else {
            user.googleId = profile.id;
            user.email = user.email || email;
            user.profilePicture = user.profilePicture || profile.photos?.[0]?.value || "";
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
} else {
  console.warn("Google auth disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing");
}

module.exports = passport;
