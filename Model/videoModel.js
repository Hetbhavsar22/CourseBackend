const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const videoSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    sdescription: {
      type: String,
      required: true,
    },
    ldescription: {
      type: String,
      required: true,
    },
    dvideo: {
      type: String,
      default: null,
    },
    thumbnail: {
      type: String,
      // required: function() {
      //   return this.typev === 'video';
      // },
    },
    videofile: {
      type: String,
      // required: function() {
      //   return this.typev === 'video';
      // },
    },
    pdf: {
      type: String,
      // required: function() {
      //   return this.typev === 'pdf';
      // },
    },
    ppt: {
      type: String,
      // required: function() {
      //   return this.typev === 'pdf';
      // },
    },
    doc: {
      type: String,
      // required: function() {
      //   return this.typev === 'pdf';
      // },
    },
    tags: {
      type: Array,
      required: true,
    },
    typev: {
      type: String,
      enum: ['video', 'document'],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: { 
      type: Number, 
      default: 0 
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
