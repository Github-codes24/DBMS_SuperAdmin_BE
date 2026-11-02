// controllers/helpers.ts
import { RequestHandler, Response } from "express";
export const ok =
 (res: Response, data: unknown, status = 200) =>
  res.status(status).
  json({ success: true, data 
});

export const wrap = 
(fn: RequestHandler): RequestHandler => 
(req, res, next) =>
 Promise.resolve(
    fn(req, res, next))
 .catch(next);