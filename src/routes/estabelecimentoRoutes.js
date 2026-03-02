const { Router } = require("express");
const EstabelecimentoController = require("../controllers/EstabelecimentoController");

const rotas = Router();

rotas.post("/", EstabelecimentoController.create);
rotas.get("/", EstabelecimentoController.index);
rotas.get("/:id", EstabelecimentoController.show);
rotas.put("/:id", EstabelecimentoController.update);
rotas.delete("/:id", EstabelecimentoController.delete);

module.exports = rotas;
