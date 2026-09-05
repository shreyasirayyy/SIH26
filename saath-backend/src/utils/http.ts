import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
export class AppError extends Error { constructor(public status: number, public code: string, message: string, public details?: unknown){ super(message); } }
export const requestId = (req: Request, _res: Response, next: NextFunction) => { (req as Request & { requestId: string }).requestId = randomUUID(); next(); };
export const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success:true, data, request_id:(res.req as Request & {requestId?:string}).requestId });
export const fail = (res: Response, error: AppError|Error) => { const e = error instanceof AppError ? error : new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'); return res.status(e.status).json({ success:false, error:{code:e.code,message:e.message, ...(e.details ? {details:e.details}:{})}, request_id:(res.req as Request & {requestId?:string}).requestId }); };
export const asyncRoute = (fn: (req:Request,res:Response,next:NextFunction)=>Promise<unknown>) => (req:Request,res:Response,next:NextFunction) => Promise.resolve(fn(req,res,next)).catch(next);
