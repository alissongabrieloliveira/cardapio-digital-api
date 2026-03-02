const { Router } = require("express");
const estabelecimentoRoutes = require("./estabelecimentoRoutes");

const rotas = Router();

rotas.use("/estabelecimentos", estabelecimentoRoutes);

module.exports = rotas;
