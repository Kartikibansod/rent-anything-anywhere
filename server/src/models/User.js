const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const validator = require("validator");

const verificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required"
    },
    method: {
      type: String,
      enum: ["none", "college_id", "email_domain"],
      default: "none"
    },
    collegeIdImage: {
      url: String,
      publicId: String
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false
    },
    googleId: {
      type: String,
      index: true,
      sparse: true
    },
    googleOnboardingPending: {
      type: Boolean,
      default: false
    },
    userType: {
      type: String,
      enum: ["student", "local"],
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    collegeId: String,
    locationText: {
      type: String,
      trim: true,
      default: ""
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ""
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    otp2faEnabled: {
      type: Boolean,
      default: false
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    profileCompleted: {
      type: Boolean,
      default: false
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    avatar: {
      url: String,
      publicId: String
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      }
    },
    verification: {
      type: verificationSchema,
      default: () => ({})
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

userSchema.pre("validate", function setVerificationDefaults(next) {
  if (this.userType !== "student") {
    this.verification.status = "not_required";
    this.verification.method = "none";
  } else if (this.collegeId) {
    this.verification.status = "pending";
    this.verification.method = "college_id";
  }

  this.profileCompleted = Boolean(this.name && this.locationText);
  this.isVerified = Boolean(
    this.isEmailVerified
      && this.profileCompleted
      && (this.userType !== "student" || this.verification.status === "approved")
  );

  next();
});

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = { User };
