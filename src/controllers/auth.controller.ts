// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import userRepo from '../models/user';
import { comparePassword, hashPassword } from '../services/password.service';
import { generateToken } from '../services/auth.service';
import { generateResetToken, hashResetToken, getResetExpiresAt } from '../services/password.service';


const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isForm = (req: Request) =>
  !req.is('application/json') && !(req.headers['content-type'] || "").includes('application/json')

// 👇 type guard para estrechar el tipo sin castear
function isRole(val: unknown): val is 'client' | 'admin' {
  return val === 'client' || val === 'admin';
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  samesite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const {
    first_name,
    last_name,
    dni,
    email,
    password,
    age,
    state,
    city,
    street,
    street_number,
    postal_code,
  } = req.body;

  const data = {
    first_name: String(first_name ?? '').trim(),
    last_name: String(last_name ?? '').trim(),
    dni: String(dni ?? '').trim(),
    email: String(email ?? '').trim().toLowerCase(),
    password: String(password ?? ''),
    age: Number(age),
    state: String(state ?? '').trim(),
    city: String(city ?? '').trim(),
    street: String(street ?? '').trim(),
    street_number: String(street_number ?? '').trim(),
    postal_code: String(postal_code ?? '').trim(),
  };

  const missing =
    !data.first_name || !data.last_name || !data.dni || !data.email || !data.password ||
    !Number.isFinite(data.age) || !data.state || !data.city || !data.street || !data.street_number || !data.postal_code;

  if (missing) { isForm(req) ? res.redirect('/auth/register?error=missing') : res.status(400).json({ error: 'Todos los campos son obligatorios.' }); return; }
  if (!isEmail(data.email)) { isForm(req) ? res.redirect('/auth/register?error=email') : res.status(400).json({ error: 'Email inválido.' }); return; }
  if (!Number.isInteger(data.age) || data.age < 18) { isForm(req) ? res.redirect('/auth/register?error=age') : res.status(400).json({ error: 'Debes ser mayor o igual a 18 años.' }); return; }
  if (data.password.length < 8) { isForm(req) ? res.redirect('/auth/register?error=password') : res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' }); return; }

  try {
    const hashed = await hashPassword(data.password);

    const created = await userRepo.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        dni: data.dni,
        email: data.email,
        password: hashed,
        age: data.age,
        state: data.state,
        city: data.city,
        street: data.street,
        street_number: data.street_number,
        postal_code: data.postal_code,
        // no enviamos role: Prisma lo pone por defecto (client)
      },
      select: { id: true, email: true, role: true },
    });

    // 👇 aquí estrechamos el tipo SIN cast
    if (!isRole(created.role)) {
      res.status(500).json({ error: 'Rol inválido en el servidor.' });
      return;
    }

    const token = generateToken({
      id: created.id,
      email: created.email,
      role: created.role, // ya es 'client' | 'admin' gracias al type guard
    });
    res.cookie('token', token, cookieOpts)

    //res.status(201).json({ token, user: created });
    isForm(req)? res.redirect('/'): res.status(201).json({ok:true, user: created});;
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const fields = (error.meta as any)?.target ?? [];
      const msg = fields.includes('email') ? 'Ya existe un usuario con ese email.'
                : fields.includes('dni')   ? 'Ya existe un usuario con ese DNI.'
                : 'Ya existe un usuario con ese dato único.';
      isForm(req) ? res.redirect('/auth/register?error=duplicate') : res.status(409).json({ error: msg });
      return;
    }
    console.error(error);
    isForm(req) ? res.redirect('/auth/register?error=server') : res.status(500).json({ error: 'Hubo un error en el sistema.' });
  }
};


export const login = async(req:Request, res: Response): Promise<void> =>{
   const {email,password} = req.body;
  

   if(!email || !password){
     isForm(req) ? res.redirect('/auth/login?error=missing') : res.status(400).json({error:"Faltan credenciales"});
     return;
   }
   try{
    const user = await userRepo.findUnique({ 
      where: {email}
    })
    if(!user){
      isForm(req) ? res.redirect('/auth/login?error=invalid') : res.status(404).json({error: 'No se encuentra el usuario'});
      return;
    }
    const isPassword = await comparePassword(password, user.password);
    if(!isPassword){
       isForm(req) ? res.redirect('/auth/login?error=invalid') : res.status(401).json({error: 'Contraseña incorrecta'});
      return;
    }
     const token = generateToken({
      id:    user.id,
      email: user.email,
      role:  user.role, // ya es 'client' | 'admin' gracias al type guard
    });
    res.cookie('token', token, cookieOpts);
     isForm(req) ? res.redirect('/') : res.status(200).json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
    //res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  }catch(error){
    console.error(error);
    isForm(req) ? res.redirect('/auth/login?error=server') : res.status(500).json({ error: 'Hubo un error en el sistema.' });
  }
  
}

export const renderForgotPassword = (req: Request, res: Response) =>{
  res.render("auth/forgot-password",{message: null, error: null});
};

export const forgotPassword = async (req:Request, res: Response)=>{
  const {email} = req.body;

  const genericMsg =
  "Si el mail esta registrado, te enviamos un enlace para restablecer tu contraseña";

  const cleanEmail = String(email ?? "").trim().toLowerCase();

  if(!cleanEmail || !isEmail(cleanEmail)){
    return res.status(400).render("auth/forgot-password",{
      message: null,
      error: "Ingresa un email valido.",
    });
  }

  try{
    const user = await userRepo.findUnique({
      where: {email: cleanEmail},
    });

    //Respuesta neutra
    if(!user){
      return res.render("auth/forgot-password",{
        message: genericMsg,
        error: null,
      });
    }

    const {token, tokenHash} = generateResetToken();
    const expiresAt = getResetExpiresAt(30);
    
    await userRepo.update({
      where: {id: user.id},
      data:{
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,

      },
      select: {id: true},
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`;

    console.log("Reset Link",resetLink);

    return res.render("auth/forgot-password", {
      message: genericMsg,
      error: null,
    });
  }catch(error){
    console.error(error);
    return res.status(500).render("auth/forgot-password",{
      message: null,
      error: "Hubo un error en el sistema.",
    })
  }
};

export const renderResetPassword = (req: Request, res: Response) =>{
  const token = req.query.token;
  
  if(!token || typeof token !== "string"){
    return res.status(400).send("token invalido");
  }
  res.render("auth/reset-password", {token, error: null});
};

export const resetPassword = async (req: Request, res: Response)=>{
  const{token, password, confirmPassword} = req.body;

  const cleanToken = String(token ?? "").trim();
  const cleanPassword = String(password ?? "");
  const cleanConfirm = String(confirmPassword ?? "");


  if(!cleanToken || !cleanPassword || !cleanConfirm) {
    return res.status(400).render("auth/reset-password",{
      token: cleanToken,
      error: "Completa todos los campos. ",
    });
  }

  if(cleanPassword !== cleanConfirm){
    return res.status(400).render("auth/reset-password",{
      token: cleanToken,
      error: "La contraseña no coinciden. ",
    });
  }

  if(cleanPassword.length < 8){
    return res.status(400).render("auth/reset-password", {
      token: cleanToken,
      error: "La contraseña debe tener al menos 8 caracteres. ",
    });
  }

  try{
    const tokenHash = hashResetToken(cleanToken);

    const user = await userRepo.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {gt: new Date() }

      },
      select:{id: true},
    });

    if(!user){
      return res.status(400).render("auth/reset-password",{
        token: cleanToken,
        error: "El enlace es inavido o expiro.",
      });
    }

    const newHash = await hashPassword(cleanPassword);

    await userRepo.update({
      where: {id: user.id},
      data: {
        password: newHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
      select: {id: true}
    });

    return res.redirect("/auth/login");
  }catch(error){
    console.error(error);
    return res.status(500).render("auth/reset-password", {
      token: cleanToken,
      error: "Hubo un error en el sistema. ",
    });
  }

};

export const logout = (req: Request, res: Response):void =>{
  res.clearCookie('token', {httpOnly:true, sameSite: 'lax', secure: process.env.NODE_ENV === "production"});
  res.redirect('/');
}