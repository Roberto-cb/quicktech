//modelo de prisma User
import {PrismaClient} from '@prisma/client';


const prisma = new PrismaClient();


export default prisma.user;

