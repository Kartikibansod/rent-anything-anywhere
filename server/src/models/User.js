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
      enum: ["none", "college_id"],
      default: "none"
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
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      },
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
    }
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

