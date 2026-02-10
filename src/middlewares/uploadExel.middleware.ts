import multer from "multer";

const storage = multer.memoryStorage();


export const uploadExel = multer({
    fileFilter: (_req,file, cb) =>{
        const name = file.originalname.toLowerCase();
        const ok = 
        name.endsWith(".xlsx") ||
        name.endsWith(".xls")  ||
        file.mimetype.includes("spreandheetml") ||
        file.mimetype === "application/vnd.ms-excel";

        if(!ok) return cb(new Error("Solo se permiten archivos .xlsc o .xls"));
        cb(null,true);
    },
});
