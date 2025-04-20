import mongoose from "mongoose"

const tripSchema = new mongoose.Schema({
  destination: {
    type: String,
    required: true,
    trim: true,
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  collaborators: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      budgetContribution: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending",
      },
      hasPaid: {
        type: Boolean,
        default: false,
      },
      paymentDate: {
        type: Date,
        default: null,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const Trip = mongoose.model("Trip", tripSchema)
export default Trip
