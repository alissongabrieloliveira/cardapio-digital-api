const { Router } = require("express");
const CategoriaController = require("../controllers/CategoriaController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.use(authMiddleware);

rotas.post("/", CategoriaController.create);
rotas.get("/", CategoriaController.index);
rotas.put("/:id", CategoriaController.update);
rotas.delete("/:id", CategoriaController.delete);

module.exports = rotas;
