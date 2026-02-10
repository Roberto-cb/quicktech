import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exportamos el modelo SaleDetail para poder utilizarlo en otras partes de la aplicación
export default prisma.saleDetail;