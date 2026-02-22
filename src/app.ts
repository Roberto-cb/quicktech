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

/**
 * CONFIGURACIÓN DE RUTAS DINÁMICAS (HÍBRIDO LOCAL/PRODUCCIÓN)
 * process.cwd() es la raíz del proyecto.
 * __dirname es donde está este archivo (src/ o dist/).
 */
app.set('view engine', 'ejs');

// Buscamos las vistas en ambos lugares posibles
app.set('views', [
    path.join(__dirname, 'views'),        // Para producción (dist/views)
    path.join(process.cwd(), 'src', 'views') // Para local (src/views)
]);

// Servimos archivos estáticos (CSS, JS, Imágenes)
// Intentamos primero en dist/public y luego en src/public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(process.cwd(), 'src', 'public')));

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
    console.error("Error detectado:", err.message);
    const status = err.status || 500;
    
    // Si falla una vista, al menos enviamos un JSON o un mensaje simple
    try {
        res.status(status).render('shop/home', {
            error: err.message || 'Ocurrió un error inesperado en el servidor',
            user: (req as any).user || null
        });
    } catch (renderError) {
        res.status(status).send('Error crítico de renderizado. Verifique las carpetas de vistas.');
    }
});

console.log("Servidor QuickTech inicializado - Modo Híbrido Activo");
export default app;