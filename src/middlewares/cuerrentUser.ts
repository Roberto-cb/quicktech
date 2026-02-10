import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"


type Payload = {id:number; email: string; role: "client" | "admin"; first_name?: string}

export default function currentUser(req:Request, res: Response, next: NextFunction) {
    const token = (req as any).cookies?.token;

    if(!token){
        res.locals.user = null;
        return next();
    }

    try{
        const secret = process.env.JWT_SECRET || "default-secret";
        const payload =  jwt.verify(token,secret) as Payload;
        res.locals.user= payload;
    }catch{
       res.locals.user = null;
    }
    next();
}