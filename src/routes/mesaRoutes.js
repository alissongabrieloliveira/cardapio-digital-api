const { Router } = require("express");
const MesaController = require("../controllers/MesaController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.use(authMiddleware);

rotas.post("/", MesaController.create);
rotas.get("/", MesaController.index);
rotas.post("/:id/abrir", MesaController.abrirMesa);
rotas.post("/:id/fechar", MesaController.fecharMesa);
rotas.delete("/:id", MesaController.delete);

module.exports = rotas;
