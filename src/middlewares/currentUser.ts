import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from '../models/jwt.interface';

export const currentUser = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    res.locals.user = null;
    return next();
  }

  try {
    // Realizamos el casting a JwtPayload para asegurar los datos
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;

    // ✅ Ya no tira error porque req.user está definido globalmente en express.d.ts
    (req as any).user = decoded; 
    res.locals.user = decoded;

    next();
  } catch (error) {
    res.locals.user = null;
    next();
  }
};

export default currentUser;
/*
type Payload = {id:number; email: string; role: "client" | "admin"; first_name?: string}

export default function currentUser(req:Request, res: Response, next: NextFunction) {
    const token = (req as any).cookies.token;

    if(!token){
        res.locals.user = null;
        return next();
    }

    try{

        const decoded = jwt.verify(token,process.env.JWT_SECRET!) as any;
        req.user = decoded;
        res.locals.user= decoded;
        //const secret = process.env.JWT_SECRET || "default-secret";
        //const payload =  jwt.verify(token,secret) as Payload;
        //res.locals.user= payload;
    }catch{
       res.locals.user = null;
       next();
    }
    
}
*/