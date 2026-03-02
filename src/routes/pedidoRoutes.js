const { Router } = require("express");
const PedidoController = require("../controllers/PedidoController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.use(authMiddleware);

rotas.post("/", PedidoController.create);
rotas.get("/", PedidoController.index);

module.exports = rotas;
