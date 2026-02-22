import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import path from 'path';
import authRoutes from './routes/auth.routes'
import usersRoutes from './routes/user.routes'
import productRoutes from './routes/product.routes'
import orderRoutes from './routes/order.routes'
import cartsRoutes from './routes/cart.routes'
import shopRoutes from './routes/shop.routes'
import currentUser from './middlewares/currentUser';
import profileRoutes from './routes/profile.routes';

const app = express();

/** * AJUSTE PARA PRODUCCIÓN:
 * En Railway, el archivo compilado está en 'dist/app.js'.
 * Usamos una lógica para encontrar la carpeta 'views' y 'public' 
 * sin importar si estamos en src/ o en dist/.
 */
const rootDir = __dirname.endsWith('dist') || __dirname.includes('dist') 
    ? path.join(__dirname) 
    : __dirname;

app.set('view engine', 'ejs');

// Buscamos las vistas: primero intenta en la carpeta actual, si no, sube un nivel
app.set('views', [
    path.join(rootDir, 'views'),
    path.join(process.cwd(), 'src', 'views'),
    path.join(process.cwd(), 'views')
]);

// Archivos estáticos (CSS, Imágenes, JS del cliente)
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.static(path.join(rootDir, 'public')));

// Middlewares estándar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

app.use(currentUser);

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/cart', cartsRoutes);
app.use("/", shopRoutes);
app.use("/profile", profileRoutes);

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).render('shop/home', {
        error: err.message || 'Ocurrió un error inesperado en el servidor',
        user: (req as any).user || null // Aseguramos que no rompa si falta el usuario
    });
});

console.log("Servidor QuickTech inicializado correctamente");
export default app;