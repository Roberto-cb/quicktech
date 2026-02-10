import { Request, Response } from "express";
import product from "../models/product";
import { Prisma } from "@prisma/client";
import XLSX from "xlsx";

/**
 * DB: Product.dimensions es String (LongText)
 * Front: manda dimensions como objeto (o string JSON)
 * -> Guardamos SIEMPRE como string JSON
 */
const toDimensionsString = (input: any): string | null => {
  let d = input;

  // Si viene como string, intentar parsear (soporta JSON string y casos dobles)
  if (typeof d === "string") {
    try { d = JSON.parse(d); } catch { return null; }
  }
  if (typeof d === "string") {
    try { d = JSON.parse(d); } catch { return null; }
  }

  // Debe ser objeto plano
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;

  // Normalizar keys esperadas (opcional pero recomendado)
  const largo = Number((d as any).largo ?? 0);
  const ancho = Number((d as any).ancho ?? 0);
  const grosor = Number((d as any).grosor ?? 0);

  if (![largo, ancho, grosor].every(Number.isFinite)) return null;

  return JSON.stringify({ largo, ancho, grosor });
};

const fromDimensionsString = (input: any): any | null => {
  if (typeof input !== "string") return null;
  try { return JSON.parse(input); } catch { return null; }
};

const decToNumber = (v: any): number => {
  if (v && typeof v === "object" && "toNumber" in v) return (v as any).toNumber();
  return Number(v);
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const {
    type,
    category,
    brand,
    model,
    dimensions,
    price,
    image_url,
    features,
    stock,
  } = req.body;

  // ✅ Guardar dimensions como string JSON
  const dimsStr = toDimensionsString(dimensions);
  if (!dimsStr) {
    res.status(400).json({ error: "Dimensiones debe ser un objeto JSON válido" });
    return;
  }

  try {
    const newProduct = await product.create({
      data: {
        type,
        category,
        brand,
        model,
        dimensions: dimsStr, 
        price: new Prisma.Decimal(String(price)),
        image_url,
        features,
        stock,
      },
    });


    const safe: any = {
      ...newProduct,
      price: decToNumber((newProduct as any).price),
      dimensions: fromDimensionsString((newProduct as any).dimensions),
    };

    res.status(201).json({ message: "Se creó con éxito el producto", product: safe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el producto." });
  }
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || "").trim();

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));
    const skip = (page - 1) * pageSize;

    const sort = String(req.query.sort || "newest");
    const orderBy =
      sort === "price_asc" ? { price: "asc" as const } :
      sort === "price_desc" ? { price: "desc" as const } :
      { id: "desc" as const };

    const where = {
      isActive: true,
      ...(q
        ? {
            OR: [
              { brand: { contains: q } },
              { model: { contains: q } },
              { category: { contains: q } },
              { type: { contains: q } },
            ],
          }
        : {}),
    };

    const [items, count] = await Promise.all([
      product.findMany({ where, orderBy, take: pageSize, skip }),
      product.count({ where }),
    ]);

    // ✅ devolver price como number y dimensions como objeto
    const safe = items.map((p: any) => ({
      ...p,
      price: decToNumber(p.price),
      dimensions: fromDimensionsString(p.dimensions),
    }));

    res.status(200).json({
      items: safe,
      page,
      pageSize,
      total: count,
      hasMore: page * pageSize < count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener todos los productos" });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID invalido" });
    return;
  }

  try {
    const foundProduct = await product.findFirst({
      where: { id, isActive: true },
    });

    if (!foundProduct) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const safe = {
      ...foundProduct,
      price: decToNumber(foundProduct.price),
      dimensions: fromDimensionsString(foundProduct.dimensions),
    };

    res.status(200).json(safe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    type,
    category,
    brand,
    model,
    dimensions,
    price,
    image_url,
    features,
    stock,
  } = req.body;

  let dimsStr: string | undefined = undefined;
  if (dimensions !== undefined) {
    const parsed = toDimensionsString(dimensions);
    if (!parsed) {
      res.status(400).json({ error: "dimensiones debe ser un JSON válido" });
      return;
    }
    dimsStr = parsed;
  }

  try {
    const updated = await product.update({
      where: { id: Number(id) },
      data: {
        type,
        category,
        brand,
        model,
        ...(dimsStr !== undefined ? { dimensions: dimsStr } : {}),
        price: price !== undefined ? new Prisma.Decimal(String(price)) : undefined,
        image_url,
        features,
        stock,
      },
    });


    const safe: any = {
      ...updated,
      price: decToNumber((updated as any).price),
      dimensions: fromDimensionsString((updated as any).dimensions),
    };

    res.status(200).json({ message: "Producto actualizado exitosamente", product: safe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en actualizar el producto" });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id)
  if(!Number.isInteger(id)|| id <= 0){
    res.status(400).json({error: "ID invalido"});
    return;
  }

  try {

    const found = await product.findUnique({where: {id}});

    if(!found){
      res.status(404).json({error: "Producto no encontrado"});
      return;
    }

    if(!found.isActive){
      res.status(200).json({message: "Producto ya estaba desactivado"});
      return;
    }


    await product.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({ message: "Producto desactivado (soft delete)" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
};

export const renderProductDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).send("ID INVALIDO");

    const foundProduct = await product.findFirst({
      where: { id, isActive: true },
    });

    if (!foundProduct) return res.status(404).render("shop/product_detail", { product: null });

    const safe: any = {
      ...foundProduct,
      price: decToNumber((foundProduct as any).price),
      dimensions: fromDimensionsString((foundProduct as any).dimensions),
    };

    return res.render("shop/product_detail", {
      title: `${safe.brand} ${safe.model}`,
      product: safe,
    });
  } catch (err) {
    console.error("renderProductDetail error:", err);
    return res.status(500).send("Error interno");
  }
};


export const importProductsFromExcel = async (req:Request, res: Response): Promise<void> =>{
  try{
    const file = (req as any).file as Express.Multer.File | undefined;
    if(!file){
      res.status(400).json({error:"No se subio ningun archivo(capmpo:excel)"});
      return;
    }

    const workBook = XLSX.read(file.buffer, {type: "buffer"});
    const sheetName = workBook.SheetNames[0];
    if(!sheetName){
      res.status(400).json({error: "El archivo no tiene hojas"});
      return;
    }

    const sheet = workBook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet,{defval: ""});


    if(!rows.length){
      res.status(400).json({erro:"El exel esta vacio"});
      return;
    }

    const created: any[] = [];
    const failed: Array<{row: number, reason: string}> = [];

    const pick = (r: any, key: string) =>{
      //Soport headers con variantes tipicas

      return (
        r[key] ??
        r[key.toUpperCase()] ??
        r[key.toLowerCase()] ??
        r[key.replace(/\s+/g, "_")] ??
        ""
      );

    };

    for(let i = 0; i < rows.length; i++){
      const r = rows[i];

      const type = String(pick(r,"type")).trim();
      const category = String(pick(r,"category")).trim();
      const brand = String(pick(r,"brand")).trim();
      const modelName = String(pick(r,"model")).trim();
      const image_url = String(pick(r,"image_url")).trim();
      const features= String(pick(r,"features")).trim();
      const priceRaw = pick(r,"price");
      const stockRaw = pick(r,"stock");
      const dimensionsRaw = pick(r,"dimensions");

      if(!type || !category || !brand || !modelName){
        failed.push({row: i + 2, reason: "Faltan campos obligatorios(tyep/category/brand/model"});
        continue;
      }

      const priceNum = Number(String(priceRaw).replace(",","."));
      if(!Number.isFinite(priceNum) || priceNum <= 0){
        failed.push({row: i + 2, reason: "price invalido (numero > 0)"});
        continue;
      }

      let stockVal: number | undefined = undefined;
      if(String(stockRaw).trim() !== ""){
        const n = Number(String(stockRaw));
        if(!Number.isInteger(n) || n < 0){
          failed.push({row: i + 2, reason: "Stock invalido(entero >= 0)"});
          continue;
        }
        stockVal = n;
      }

      const dimsStr = toDimensionsString(dimensionsRaw);
      if(!dimsStr){
        failed.push({row: i + 2, reason: "dimensions invalido. Usa JSON: {\"largo\":10,\"ancho\":5,\"grosor\":2}"});
        continue;
      }

      try{
        const p = await product.create({
          data: {
            type,
            category,
            brand,
            model:modelName,
            dimensions:dimsStr,
            price: new Prisma.Decimal(String(priceNum)),
            image_url: image_url || "/img/no-imag.png",
            features: features || "Sin descripcion",
            stock: stockVal,


          },
        });
        created.push({id: p.id, brand: p.brand, model: p.model });
      }catch(e: any){
        failed.push({row: i +2, reason: e?.message || "Error insertando en DB"});
      }
    }

    res.status(200).json({
      message:"Importacion finalizada",
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    })
  }catch(err){
    console.error("ImportProductsFromExcel error", err);
    res.status(500).json({error: "Error interno importanod Excel"});
  }
};


// GET /products/admin
export const getAllProductsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || "").trim();

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));
    const skip = (page - 1) * pageSize;

    const sort = String(req.query.sort || "newest"); // ✅ typo fix
    const orderBy =
      sort === "price_asc" ? { price: "asc" as const } :
      sort === "price_desc" ? { price: "desc" as const } :
      { id: "desc" as const };

    const where = q
      ? {
          OR: [
            { brand: { contains: q, mode: "insensitive" as const } },
            { model: { contains: q, mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
            { type: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, count] = await Promise.all([
      product.findMany({ where, orderBy, take: pageSize, skip }),
      product.count({ where }),
    ]);

    const safe = items.map((p: any) => ({
      ...p,
      price: decToNumber(p.price),
      dimensions: fromDimensionsString(p.dimensions),
    }));

    res.status(200).json({
      items: safe,
      page,
      pageSize,
      total: count,
      hasMore: page * pageSize < count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener productos (admin)" });
  }
};


// GET /products/admin/:id

export const getProductByIdAdmin = async (req: Request, res: Response): Promise<void> =>{
  const id = Number(req.params.id);

  if(!Number.isInteger(id)|| id <= 0){
    res.status(400).json({error: "ID invalido"});
    return;
  }

  try{
    const foundProduct = await product.findUnique({where: {id}});

    if(!foundProduct){
      res.status(404).json({ error: "Producto no encontrado"});
      return;
    }

    const safe: any = {
      ...foundProduct,
      price: decToNumber(foundProduct.price),
      dimensions: fromDimensionsString(foundProduct.dimensions),
    };

    res.status(200).json(safe);
  }catch(error){
    console.log(error);
    res.status(500).json({error: "Error al obtener producto (admin)"});
  }
};
// PATCH /products/:id/active
export const setProductActive = async (req: Request, res: Response): Promise<void> =>{
  const id = Number(req.params.id);
  const {isActive} = req.body as {isActive?: boolean};

  if(!Number.isInteger(id) || id <= 0 || typeof isActive !== "boolean"){
    res.status(400).json({error: "Datos invalido"});
    return;
  }

  try{
    const updated = await product.update({
      where: {id},
      data:{isActive},
    });

    const safe: any = {
      ...updated,
      price: decToNumber(updated.price),
      dimensions: fromDimensionsString(updated.dimensions),
    };
    res.status(200).json({message: "Estado actualizado", product: safe});
  }catch(error){
    console.error(error);
    res.status(500).json({error: "Error al cambiar estado del producto"});
  }
};




