const { Router } = require("express");
const AuthController = require("../controllers/AuthController");

const rotas = Router();
rotas.post("/login", AuthController.login);

module.exports = rotas;
