const { Router } = require("express");
const ProdutoController = require("../controllers/ProdutoController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.use(authMiddleware);

rotas.post("/", ProdutoController.create);
rotas.get("/", ProdutoController.index);
rotas.put("/:id", ProdutoController.update);
rotas.delete("/:id", ProdutoController.delete);

module.exports = rotas;
