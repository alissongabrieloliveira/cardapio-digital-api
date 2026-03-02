const { Router } = require("express");
const estabelecimentoRoutes = require("./estabelecimentoRoutes");
const usuarioRoutes = require("./usuarioRoutes");
const authRoutes = require("./authRoutes");

const rotas = Router();

rotas.use("/estabelecimentos", estabelecimentoRoutes);
rotas.use("/usuarios", usuarioRoutes);
rotas.use("/auth", authRoutes);

module.exports = rotas;
