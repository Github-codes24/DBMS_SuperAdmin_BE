// models/Counter.ts: replaces the fake counter document you kept inside `projects`
import { Schema, model } from "mongoose";
const counterSchema = new Schema({ _id: { type: String }, seq: { type: Number, default: 0 } }, { collection: "counters" });
export const Counter = model("Counter", counterSchema);