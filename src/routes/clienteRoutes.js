const { Router } = require("express");
const ClienteController = require("../controllers/ClienteController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.use(authMiddleware);

rotas.post("/", ClienteController.create);
rotas.get("/", ClienteController.index);

rotas.post("/:id/enderecos", ClienteController.addEndereco);
rotas.get("/:id/enderecos", ClienteController.listEnderecos);

module.exports = rotas;
