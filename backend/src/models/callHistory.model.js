const mongoose = require("mongoose");

const callHistorySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["video", "audio"],
            required: true,
        },
        caller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["ringing", "calling", "connected", "disconnected", "declined"],
            default: "ringing",
        },
        duration: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CallHistory", callHistorySchema);
