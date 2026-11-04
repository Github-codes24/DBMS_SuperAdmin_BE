"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = void 0;
// models/Counter.ts: replaces the fake counter document you kept inside `projects`
const mongoose_1 = require("mongoose");
const counterSchema = new mongoose_1.Schema({ _id: { type: String }, seq: { type: Number, default: 0 } }, { collection: "counters" });
exports.Counter = (0, mongoose_1.model)("Counter", counterSchema);
//# sourceMappingURL=counter.js.map