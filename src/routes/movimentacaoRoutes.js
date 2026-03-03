const { Router } = require("express");
const MovimentacaoFinanceiraController = require("../controllers/MovimentacaoFinanceiraController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.use(authMiddleware);

rotas.post("/", MovimentacaoFinanceiraController.create);
rotas.get("/", MovimentacaoFinanceiraController.index);

module.exports = rotas;
