const { Router } = require("express");
const CardapioPublicoController = require("../controllers/CardapioPublicoController");
const validaTokenMesa = require("../middlewares/validaTokenMesa");

const rotas = Router();

rotas.use("/mesa", validaTokenMesa);

rotas.get("/mesa/cardapio", CardapioPublicoController.getCardapio);

rotas.post("/mesa/pedidos", CardapioPublicoController.criarPedidoMesa);

module.exports = rotas;
