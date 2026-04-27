const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { env } = require("./env");
const { User } = require("../models/User");

if (env.google.clientId && env.google.clientSecret) {
  passport.use(new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: `${env.serverUrl}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const isEmailVerified = Boolean(profile.emails?.[0]?.verified ?? true);
        if (!email || !isEmailVerified) return done(new Error("Google account email is not verified"));

        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            name: profile.displayName || "Google User",
            email,
            password: `google_${profile.id}_${Date.now()}`,
            userType: "local",
            googleOnboardingPending: true,
            googleId: profile.id,
            isEmailVerified: true,
            avatar: profile.photos?.[0]?.value ? { url: profile.photos[0].value, publicId: `google_${profile.id}` } : undefined
          });
        } else {
          user.googleId = user.googleId || profile.id;
          user.isEmailVerified = true;
          await user.save({ validateBeforeSave: false });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

module.exports = passport;
