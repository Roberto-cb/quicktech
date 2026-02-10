// src/models/cart.ts
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export default prisma.cart
