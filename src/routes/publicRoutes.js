const { Router } = require("express");
const CardapioPublicoController = require("../controllers/CardapioPublicoController");
const CardapioDeliveryController = require("../controllers/CardapioDeliveryController");
const validaTokenMesa = require("../middlewares/validaTokenMesa");

const rotas = Router();

rotas.use("/mesa", validaTokenMesa);

rotas.get("/mesa/cardapio", CardapioPublicoController.getCardapio);
rotas.post("/mesa/pedidos", CardapioPublicoController.criarPedidoMesa);

rotas.get("/delivery/:slug/cardapio", CardapioDeliveryController.getCardapio);
rotas.post(
  "/delivery/:slug/pedidos",
  CardapioDeliveryController.criarPedidoDelivery,
);

module.exports = rotas;
