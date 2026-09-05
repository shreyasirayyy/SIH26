import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';
import type { AuthUser, Role } from '../types/domain.js';
export type AuthedRequest = Request & { user?: AuthUser; requestId?: string };
export function signUser(user:AuthUser){ return jwt.sign(user,env.JWT_SECRET,{expiresIn:env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']}); }
export function requireAuth(req:AuthedRequest,_res:Response,next:NextFunction){ try { const token=req.headers.authorization?.replace(/^Bearer\s+/i,''); if(!token) throw new AppError(401,'UNAUTHORIZED','Authentication is required.'); req.user=jwt.verify(token,env.JWT_SECRET) as AuthUser; next(); } catch(e){ next(e instanceof AppError?e:new AppError(401,'INVALID_TOKEN','Authentication token is invalid or expired.')); } }
export const requireRoles=(...roles:Role[])=>(req:AuthedRequest,_res:Response,next:NextFunction)=>{ if(!req.user||!roles.includes(req.user.role)) return next(new AppError(403,'FORBIDDEN','You do not have permission to access this resource.')); next(); };
export const optionalAuth=(req:AuthedRequest,_res:Response,next:NextFunction)=>{ const token=req.headers.authorization?.replace(/^Bearer\s+/i,''); if(token){try{req.user=jwt.verify(token,env.JWT_SECRET) as AuthUser;}catch{ /* anonymous */ }} next(); };
