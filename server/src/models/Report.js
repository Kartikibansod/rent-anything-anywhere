const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["user", "listing"],
      required: true
    },
    reported: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "typeRef"
    },
    typeRef: {
      type: String,
      enum: ["User", "Listing"],
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending"
    }
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

module.exports = { Report };

