const { Router } = require("express");
const EstabelecimentoController = require("../controllers/EstabelecimentoController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.post("/", EstabelecimentoController.create);
rotas.get("/", EstabelecimentoController.index);

rotas.get("/me", authMiddleware, EstabelecimentoController.me);
rotas.put("/me", authMiddleware, EstabelecimentoController.updateMe);

rotas.get("/:id", EstabelecimentoController.show);
rotas.put("/:id", EstabelecimentoController.update);
rotas.delete("/:id", EstabelecimentoController.delete);

module.exports = rotas;
