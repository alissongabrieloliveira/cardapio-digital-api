const { Router } = require("express");
const UsuarioController = require("../controllers/UsuarioController");

const rotas = Router();
rotas.post("/", UsuarioController.create);

module.exports = rotas;
