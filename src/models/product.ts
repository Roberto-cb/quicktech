import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exporta el modelo de Product para poder usarlo en otras partes de la aplicación
export default prisma.product;