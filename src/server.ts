import "dotenv/config"
import app from './app';

const PORT = process.env.PORT || 3000;

console.log("DATABASE_URL =>", process.env.DATABASE_URL);
app.listen(PORT,()=>{
    console.log(`server is running Local: http://localhost:${PORT}`)
});

//console.log(`server is running on port ${PORT}`)