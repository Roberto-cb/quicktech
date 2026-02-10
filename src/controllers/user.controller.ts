import { Request, Response } from "express";
import { hashPassword } from "../services/password.service";
import userRepo from '../models/user';



export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { first_name, last_name, dni, email, password, age, state, city, street, street_number, postal_code, role } = req.body;

  // Validaciones básicas
  if (!first_name || !last_name || !dni || !email || !password || !age || !state || !city || !street || !street_number || !postal_code) {
    res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    return;
  }

  try {
    const hashedPassword = await hashPassword(password);

    // Crear el nuevo usuario
    const createdUser = await userRepo.create({
      data: {
        first_name,
        last_name,
        dni,
        email,
        password: hashedPassword,
        age,
        state,
        city,
        street,
        street_number,
        postal_code,
        role: role || 'client',  
      },
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', user: createdUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario.' });
  }
};


export const getAll = async(req: Request, res: Response): Promise<void> =>{
  try{
    const users =await userRepo.findMany();
    res.status(200).json(users);
  }catch(error){
    console.log(error);
    res.status(500).json({error: 'Error al obtener los usuarios'});
  }
};


export const getUserById = async(req: Request, res: Response): Promise<void> =>{
  const {id} = req.params;
  try{
    const user = await userRepo.findUnique({where: {id:Number(id)}});
    if(!user){
      res.status(404).json({error:"Usuario no encontrado"});
      return;
    }
    res.status(200).json(user);
  }catch(error){
    console.error();
    res.status(500).json({error:'Error al obtener el usuario'})
  }
};

export const updateUser = async(req: Request, res: Response): Promise<void> =>{
  const {id} = req.params;
  const{
    first_name, 
    last_name, dni, email, password, age, state, city, street, street_number, postal_code, role,

  } = req.body;
   
  try{
    let hashedPassword;
    if (password) {
      
      hashedPassword = await hashPassword(password);
    }
    const updateUser = await userRepo.update({
      where:{id:Number(id)},
      data: {
        first_name,
        last_name,
        dni,
        email,
        age,
        state,
        city,
        street,
        street_number,
        postal_code,
        role: role || undefined,
        ...(hashedPassword && { password: hashedPassword }),
      },
    });
    res.status(200).json({message:'Usuario actualizado exitosamente', user:updateUser})
  }catch(error){
    console.error(error);
    res.status(500).json({erro: "Error en actualizar el usuario"})
  }
}

export const deleteUser = async(req: Request, res: Response): Promise<void> =>{
   const {id} = req.params;
   try{
     await userRepo.delete({
      where: {id:Number(id)},
     });

     res.status(200).json({message:'Se elimino con exito el usaurio'})
   }catch(error){
     console.error(error);
     res.status(500).json({error:'No se encontro el usuario.'})
   }
}