/* ============================================================
   QT_SHOP_ADMIN.JS - Gestión de Inventario y Excel
   ============================================================ */

const adminModal = document.getElementById("admin-product-modal");
const adminForm = document.getElementById("admin-product-form");
const adminTitle = document.getElementById("admin-modal-title");
const adminSaveBtn = document.getElementById("admin-modal-save");
const adminExcelInput = document.getElementById("admin-excel-file");

let adminEditingId = null;

// 1. Manejo del Modal (Interfaz)
function openAdminModal(mode){
  if(!adminModal) return;
  adminModal.hidden = false;

  if(adminTitle) adminTitle.textContent = mode === "edit" ? "Editar producto" : "Crear producto";
  if(adminSaveBtn) adminSaveBtn.textContent = mode === "edit" ? "Guardar cambios" : "Guardar";
}

function closeAdminModal(){
  if(!adminModal)return;
  adminModal.hidden = true;
  adminEditingId = null;
  if(adminForm) adminForm.reset();
  const idInput = adminForm?.querySelector('input[name="id"]');
  if(idInput) idInput.value="";
  if(adminExcelInput) adminExcelInput.value = "";
}

// 2. Lógica de Datos (Carga y Armado de Payload)

// Rellena el formulario con los datos del producto para editar
function fillAdminForm(p){
  if(!adminForm) return;
  adminForm.querySelector('[name="brand"]').value = p.brand ?? "";
  adminForm.querySelector('[name="model"]').value = p.model ?? "";
  adminForm.querySelector('[name="category"]').value = p.category ?? "";
  adminForm.querySelector('[name="type"]').value = p.type ?? "";
  adminForm.querySelector('[name="price"]').value = String(p.price ?? "");
  adminForm.querySelector('[name="stock"]').value = String(p.stock);
  adminForm.querySelector('[name="image_url"]').value = p.image_url ?? "";
  adminForm.querySelector('[name="features"]').value = p.features ?? "";
  adminForm.querySelector('[name="dimensions"]').value = JSON.stringify(p.dimensions ?? {}, null, 2);
  
  const idInput = adminForm.querySelector('input[name="id"]');
  if(idInput) idInput.value = String(p.id);
}

// Lee el formulario y crea el objeto para enviar al servidor
function buildAdminPayload(){
  if(!adminForm) return null;
  const fd = new FormData(adminForm);
  const data = Object.fromEntries(fd.entries());
  
  let dimsObj = {};
  try{
    dimsObj = JSON.parse(String(data.dimensions) || "{}");
  } catch(err) {
    throw new Error("Dimensiones: JSON inválido. Ej: {\"alto\":10,\"ancho\":5}");
  }

  return {
    type: String(data.type || "").trim(),
    category: String(data.category || "").trim(),
    brand: String(data.brand || "").trim(),
    model: String(data.model || "").trim(),
    price: Number(data.price || 0),
    image_url: String(data.image_url || "").trim(),
    features: String(data.features || "").trim(),
    stock: Number(data.stock || 0),
    dimensions: dimsObj,
  };
}

// 3. Acciones (Guardar e Importar)

// Llama a la API para guardar (Crear o Editar)
async function adminSaveProduct(e, onSuccess) {
  e.preventDefault();
  try {
    const payload = buildAdminPayload();
    let success = false;

    if (adminEditingId) {
      // Usamos la API para editar
      success = await updateProductAPI(adminEditingId, payload);
    } else {
      // Usamos la API para crear
      success = await createProductAPI(payload);
    }

    if (success) {
      closeAdminModal();
      if (onSuccess) await onSuccess();
    }
  } catch (err) {
    alert(err.message || "Error guardando producto");
  }
}

// Configura la importación de Excel
function initAdminExcelImport(onSuccess) {
    const btn = document.getElementById("admin-import-excel");
    if (!btn || !adminExcelInput) return;

    btn.addEventListener("click", async () => {
        const file = adminExcelInput.files?.[0];
        if (!file) return alert("Selecciona un archivo Excel");

        btn.disabled = true;
        btn.textContent = "Importando...";

        try {
            const res = await adminImportExcelAPI(file); 
            alert(`Importación finalizada. Creados: ${res.createdCount}`);
            closeAdminModal();
            if (onSuccess) await onSuccess();
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Importar Excel";
            adminExcelInput.value = "";
        }
    });
}