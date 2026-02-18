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

// con esto vamos a crear middleware
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// middleware para poder usar json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

app.use(currentUser);

//Routes
app.use('/auth',authRoutes);
app.use('/users',usersRoutes);
app.use('/products',productRoutes);
app.use('/orders',orderRoutes);
app.use('/cart',cartsRoutes);
app.use("/", shopRoutes);
app.use("/profile",profileRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) =>{
    console.log(err.stack);
    const status = err.status || 500;
    res.status(status).render('shop/home', {
        error: err.message || 'Ocurrio un error inesperado en el servidor'
    });
})
console.log("Este está siendo ejecutado");
export default app;
